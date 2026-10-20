require("dotenv").config();

const mongoose = require("mongoose");
const AuditLog = require("./src/models/AuditLog");
const { verifyAuditChain } = require("./src/services/auditService");

async function testAuditTampering() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Verify the original chain first.
    const original = await verifyAuditChain();

    console.log("Original chain:", original);

    if (!original.valid) {
      console.log("STOP: The original chain is already invalid.");
      return;
    }

    // Change a field temporarily, without saving it to MongoDB.
    const block = await AuditLog.findOne().sort({ sequence: 1 });

    if (!block) {
      console.log("No audit records found.");
      return;
    }

    block.action = `${block.action}_TAMPERED`;

    const crypto = require("crypto");

    // Calculate a hash for the modified in-memory record.
    // The stored database record remains untouched.
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

    const modifiedHash = crypto
      .createHash("sha256")
      .update(stableStringify(payload))
      .digest("hex");

    console.log("Stored hash:  ", block.currentHash);
    console.log("Modified hash:", modifiedHash);
    console.log(
      "Tampering detectable:",
      modifiedHash !== block.currentHash
    );
  } catch (error) {
    console.error("Test failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testAuditTampering();
