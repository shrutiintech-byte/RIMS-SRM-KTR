const AuditLog = require("../models/AuditLog");
const { verifyAuditChain } = require("../services/auditService");

// GET /api/admin/audit
const getAuditHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      AuditLog.find()
        .sort({ sequence: -1 })
        .skip(skip)
        .limit(limit)
        .populate("actorId", "fullName employeeId email role")
        .lean(),

      AuditLog.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      message: "Audit history retrieved successfully",
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Audit history retrieval failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve audit history",
    });
  }
};

// GET /api/admin/audit/verify
const verifyAuditLog = async (req, res) => {
  try {
    const result = await verifyAuditChain();

    return res.status(200).json({
      success: result.valid,
      message: result.message,
      data: {
        valid: result.valid,
        totalBlocks: result.totalBlocks,
        failedSequence: result.failedSequence,
      },
    });
  } catch (error) {
    console.error("Audit chain verification failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify the audit chain",
    });
  }
};

module.exports = {
  getAuditHistory,
  verifyAuditLog,
};