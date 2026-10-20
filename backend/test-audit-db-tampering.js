const mongoose = require("mongoose");
require("dotenv").config();

const AuditLog = require("./src/models/AuditLog");
const {
  verifyAuditChain,
} = require("./src/services/auditService");

async function main() {
  let originalRecord = null;
  let tamperingApplied = false;

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected to MongoDB.");

    const before = await verifyAuditChain();

    console.log("\n1. Original chain:");
    console.log(before);

    if (!before.valid || before.totalBlocks === 0) {
      throw new Error(
        "Original chain is invalid or empty. Stopping test."
      );
    }

    // Select the latest audit record.
    originalRecord = await AuditLog.findOne()
      .sort({ sequence: -1 })
      .lean();

    if (!originalRecord) {
      throw new Error("No audit record found.");
    }

    console.log(
      `\n2. Temporarily modifying sequence ${originalRecord.sequence}`
    );

    // Change only the action, leaving currentHash unchanged.
    const update = await AuditLog.updateOne(
      {
        _id: originalRecord._id,
        currentHash: originalRecord.currentHash,
      },
      {
        $set: {
          action: `${originalRecord.action}_TAMPER_TEST`,
        },
      }
    );

    if (update.modifiedCount !== 1) {
      throw new Error(
        "Record was not modified. Another process may have changed it."
      );
    }

    tamperingApplied = true;

    const duringTampering = await verifyAuditChain();

    console.log("\n3. Verification during tampering:");
    console.log(duringTampering);

    if (duringTampering.valid) {
      throw new Error(
        "FAIL: The modified record was not detected."
      );
    }

    console.log("\nPASS: Tampering was detected.");

  } catch (error) {
    console.error("\nTest error:", error.message);

  } finally {
    try {
      // Restore the original action even if verification fails.
      if (tamperingApplied && originalRecord) {
        const restore = await AuditLog.updateOne(
          {
            _id: originalRecord._id,
            currentHash: originalRecord.currentHash,
          },
          {
            $set: {
              action: originalRecord.action,
            },
          }
        );

        if (restore.modifiedCount !== 1) {
          console.error(
            "WARNING: Automatic restoration was not confirmed."
          );
        } else {
          console.log("\n4. Original audit record restored.");
        }
      }

      if (mongoose.connection.readyState === 1) {
        const after = await verifyAuditChain();

        console.log("\n5. Verification after restoration:");
        console.log(after);

        if (after.valid) {
          console.log(
            "\nPASS: Audit chain is valid after restoration."
          );
        } else {
          console.error(
            "\nWARNING: Audit chain is still invalid after restoration."
          );
        }
      }
    } catch (restoreError) {
      console.error(
        "\nRESTORATION/VERIFICATION ERROR:",
        restoreError.message
      );
    }

    await mongoose.disconnect();
  }
}

main();