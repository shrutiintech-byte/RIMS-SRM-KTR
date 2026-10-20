require("dotenv").config();

const crypto = require("crypto");
const mongoose = require("mongoose");
const AuditLog = require("./src/models/AuditLog");
const { verifyAuditChain } = require("./src/services/auditService");

async function runTest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Confirm the real audit chain is still valid.
    const original = await verifyAuditChain();
    console.log("Original chain:", original);

    if (!original.valid) {
      throw new Error("Original audit chain is already invalid.");
    }

    // Tamper with a copy in memory only.
    const blocks = await AuditLog.find()
      .sort({ sequence: 1 })
      .lean();

    const block = blocks[0];

    if (!block) {
      throw new Error("No audit blocks found.");
    }

    block.action = `${block.action}_TAMPERED`;

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

    const stableStringify = (value) => {
      if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
      }

      if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(",")}]`;
      }

      return `{${Object.keys(value)
        .sort()
        .map(
          (key) =>
            `${JSON.stringify(key)}:${stableStringify(value[key])}`
        )
        .join(",")}}`;
    };

    const recalculatedHash = crypto
      .createHash("sha256")
      .update(stableStringify(payload))
      .digest("hex");

    console.log("Tampered action:", block.action);
    console.log("Stored hash:", block.currentHash);
    console.log("Recalculated hash:", recalculatedHash);
    console.log(
      "Hash mismatch detected:",
      recalculatedHash !== block.currentHash
    );

    // Confirm the actual database chain remains valid.
    const after = await verifyAuditChain();
    console.log("Database chain after test:", after);
  } catch (error) {
    console.error("Test failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runTest();