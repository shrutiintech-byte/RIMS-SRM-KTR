
const crypto = require("crypto");
const mongoose = require("mongoose");

const AuditLog = require("../models/AuditLog");
const AuditCounter = require("../models/AuditCounter");

const GENESIS_HASH = "0".repeat(64);

// Create a consistent JSON representation for hashing.
function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const keys = Object.keys(value).sort();

  return `{${keys
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableStringify(value[key])}`
    )
    .join(",")}}`;
}

// Calculate the SHA-256 hash of an audit block.
function calculateHash(block) {
  const payload = {
    sequence: block.sequence,
    action: block.action,
    actorId: String(block.actorId),
    targetId: block.targetId ? String(block.targetId) : null,
    targetType: block.targetType,
    metadata: block.metadata || {},
    previousHash: block.previousHash,
    timestamp: new Date(block.timestamp).toISOString(),
  };

  return crypto
    .createHash("sha256")
    .update(stableStringify(payload))
    .digest("hex");
}

// Read the latest audit block, optionally within a transaction.
async function getLatestBlock(session) {
  let query = AuditLog.findOne().sort({ sequence: -1 });

  if (session) {
    query = query.session(session);
  }

  return query.lean();
}

// Initialize the counter from existing history and reserve a sequence.
async function reserveSequence(latestSequence, session) {
  const options = {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  };

  if (session) {
    options.session = session;
  }

  await AuditCounter.findOneAndUpdate(
    { _id: "auditLogSequence" },
    {
      $setOnInsert: {
        sequence: latestSequence,
      },
    },
    options
  );

  const updateOptions = session ? { session } : {};

  // Prevent an existing counter from falling behind the ledger.
  await AuditCounter.updateOne(
    { _id: "auditLogSequence" },
    {
      $max: {
        sequence: latestSequence,
      },
    },
    updateOptions
  );

  // The counter document serializes sequence allocation across instances.
  const counter = await AuditCounter.findOneAndUpdate(
    { _id: "auditLogSequence" },
    {
      $inc: {
        sequence: 1,
      },
    },
    {
      new: true,
      ...updateOptions,
    }
  );

  if (!counter) {
    throw new Error("Unable to reserve an audit sequence number");
  }

  return counter.sequence;
}

// Save an audit event.
// Pass a MongoDB session when this event must share a transaction
// with another database operation.
async function writeAuditEvent(
  {
    action,
    actorId,
    targetId,
    targetType,
    metadata,
  },
  session = null
) {
  const latestBlock = await getLatestBlock(session);

  const latestSequence = latestBlock
    ? latestBlock.sequence
    : 0;

  const sequence = await reserveSequence(
    latestSequence,
    session
  );

  const block = {
    sequence,
    action: action.trim(),
    actorId: new mongoose.Types.ObjectId(actorId),
    targetId: targetId
      ? new mongoose.Types.ObjectId(targetId)
      : null,
    targetType: targetType.trim(),
    metadata,
    previousHash: latestBlock
      ? latestBlock.currentHash
      : GENESIS_HASH,
    timestamp: new Date(),
  };

  const currentHash = calculateHash(block);

  const createdBlocks = await AuditLog.create(
    [
      {
        ...block,
        currentHash,
      },
    ],
    session ? { session } : {}
  );

  return createdBlocks[0].toObject();
}

// Public function for recording an audit event.
async function recordAuditEvent({
  action,
  actorId,
  targetId = null,
  targetType,
  metadata = {},
  session = null,
}) {
  if (
    typeof action !== "string" ||
    !action.trim() ||
    typeof targetType !== "string" ||
    !targetType.trim() ||
    !actorId
  ) {
    throw new Error(
      "action, actorId, and targetType are required"
    );
  }

  if (!mongoose.isValidObjectId(actorId)) {
    throw new Error("Invalid audit actor ID");
  }

  if (
    targetId !== null &&
    !mongoose.isValidObjectId(targetId)
  ) {
    throw new Error("Invalid audit target ID");
  }

  if (
    metadata !== null &&
    (typeof metadata !== "object" ||
      Array.isArray(metadata))
  ) {
    throw new Error("Audit metadata must be an object");
  }

  const safeMetadata = metadata || {};

  const input = {
    action,
    actorId,
    targetId,
    targetType,
    metadata: safeMetadata,
  };

  // When called inside a transaction, let MongoDB transaction
  // handling manage conflicts and retries.
  if (session) {
    return writeAuditEvent(input, session);
  }

  // Compatibility for existing callers that do not yet pass a session.
  // This lock is process-local, not a distributed lock.
  const previousLock =
    recordAuditEvent.lock || Promise.resolve();

  let releaseLock;

  recordAuditEvent.lock = new Promise((resolve) => {
    releaseLock = resolve;
  });

  await previousLock;

  try {
    return await writeAuditEvent(input);
  } finally {
    releaseLock();
  }
}

// Verify every sequence, previous hash, and current hash.
async function verifyAuditChain() {
  const blocks = await AuditLog.find()
    .sort({ sequence: 1 })
    .lean();

  let expectedPreviousHash = GENESIS_HASH;
  let expectedSequence = 1;

  for (const block of blocks) {
    if (block.sequence !== expectedSequence) {
      return {
        valid: false,
        message: `Sequence mismatch at block ${expectedSequence}`,
        failedSequence: expectedSequence,
      };
    }

    if (block.previousHash !== expectedPreviousHash) {
      return {
        valid: false,
        message: `Previous hash mismatch at block ${block.sequence}`,
        failedSequence: block.sequence,
      };
    }

    const expectedHash = calculateHash(block);

    if (block.currentHash !== expectedHash) {
      return {
        valid: false,
        message: `Hash mismatch at block ${block.sequence}`,
        failedSequence: block.sequence,
      };
    }

    expectedPreviousHash = block.currentHash;
    expectedSequence += 1;
  }

  return {
    valid: true,
    message: "Audit chain verified successfully",
    totalBlocks: blocks.length,
  };
}

module.exports = {
  recordAuditEvent,
  verifyAuditChain,
};
