
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Document = require("../models/Document");
const Claim = require("../models/Claim");

const {
  notifyDocumentUploaded,
  createNotification,
} = require("./notificationService");

const {
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_SIZE,
} = require("../utils/constants");

// =========================================================
// DOCUMENT UPLOAD DIRECTORY
// =========================================================

const uploadDirectory = path.resolve(
  __dirname,
  "../../uploads/claim-documents"
);

// =========================================================
// ERROR HELPER
// =========================================================

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// =========================================================
// OBJECT ID VALIDATION
// =========================================================

const validateObjectId = (id, message = "Invalid ID") => {
  if (!mongoose.isValidObjectId(id)) {
    throw createError(message, 400);
  }
};

// =========================================================
// FILE PATH VALIDATION
// =========================================================

const resolveStoredFilePath = (document) => {
  if (
    !document ||
    typeof document.filePath !== "string" ||
    !document.filePath.trim()
  ) {
    throw createError("Document file path is invalid", 404);
  }

  const relativeFilePath = document.filePath.replace(
    /^[/\\]+/,
    ""
  );

  const filePath = path.resolve(
    __dirname,
    "../..",
    relativeFilePath
  );

  const relativeToUploadDirectory = path.relative(
    uploadDirectory,
    filePath
  );

  if (
    !relativeToUploadDirectory ||
    relativeToUploadDirectory === ".." ||
    relativeToUploadDirectory.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToUploadDirectory)
  ) {
    throw createError("Invalid document file path", 400);
  }

  return filePath;
};

// =========================================================
// VERIFY FILE EXISTS
// =========================================================

const verifyPhysicalFileExists = async (filePath) => {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
  } catch {
    throw createError(
      "The requested document file could not be found",
      404
    );
  }
};

// =========================================================
// VALIDATE UPLOADED FILE
// =========================================================

const validateUploadedFile = (file) => {
  if (!file) {
    throw createError("Document file is required", 400);
  }

  if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
    throw createError(
      "Invalid document format. Only PDF, JPG, JPEG, and PNG files are allowed",
      400
    );
  }

  if (
    !Number.isFinite(file.size) ||
    file.size <= 0 ||
    file.size > MAX_DOCUMENT_SIZE
  ) {
    throw createError(
      "Document must not be empty and cannot exceed 10 MB",
      400
    );
  }

  if (
    typeof file.filename !== "string" ||
    !file.filename ||
    path.basename(file.filename) !== file.filename
  ) {
    throw createError("Uploaded filename is invalid", 400);
  }

  return true;
};

// =========================================================
// CREATE DOCUMENT OR UPLOAD A REPLACEMENT
// =========================================================

const createDocument = async ({
  facultyId,
  claimId,
  documentType,
  file,
  replacesDocumentId,
}) => {
  validateObjectId(facultyId, "Invalid faculty ID");
  validateObjectId(claimId, "Invalid claim ID");

  if (
    typeof documentType !== "string" ||
    !documentType.trim()
  ) {
    throw createError("Document type is required", 400);
  }

  validateUploadedFile(file);

  const normalizedDocumentType = documentType.trim();
  const storedFileName = path.basename(file.filename);

  const claim = await Claim.findOne({
    _id: claimId,
    faculty: facultyId,
  });

  if (!claim) {
    throw createError(
      "Claim not found or you are not authorized to access it",
      404
    );
  }

  let previousDocument = null;

  // -------------------------------------------------------
  // DRAFT CLAIM
  // -------------------------------------------------------

  if (claim.status === "DRAFT") {
    if (replacesDocumentId) {
      validateObjectId(
        replacesDocumentId,
        "Invalid document replacement ID"
      );

      previousDocument = await Document.findOne({
        _id: replacesDocumentId,
        claim: claim._id,
        faculty: facultyId,
        documentType: normalizedDocumentType,
        replacedBy: null,
      });

      if (!previousDocument) {
        throw createError(
          "The document being replaced was not found",
          404
        );
      }
    }
  }

  // -------------------------------------------------------
  // RETURNED CLAIM
  // -------------------------------------------------------

  else if (claim.status === "RETURNED") {
    if (replacesDocumentId) {
      validateObjectId(
        replacesDocumentId,
        "Invalid document replacement ID"
      );

      previousDocument = await Document.findOne({
        _id: replacesDocumentId,
        claim: claim._id,
        faculty: facultyId,
        documentType: normalizedDocumentType,
        status: "REJECTED",
        replacedBy: null,
      });

      if (!previousDocument) {
        throw createError(
          "The selected document is not an eligible rejected document for replacement",
          409
        );
      }
    } else {
      // Preserve compatibility with existing frontend clients.
      previousDocument = await Document.findOne({
        claim: claim._id,
        faculty: facultyId,
        documentType: normalizedDocumentType,
        status: "REJECTED",
        replacedBy: null,
      }).sort({
        rejectedAt: -1,
        createdAt: -1,
      });
    }

    if (!previousDocument) {
      const activeDocument = await Document.findOne({
        claim: claim._id,
        faculty: facultyId,
        documentType: normalizedDocumentType,
        status: { $ne: "REJECTED" },
        replacedBy: null,
      });

      if (activeDocument) {
        throw createError(
          "This document type already has an active document. Ask the Admin to reject the existing document before replacing it.",
          409
        );
      }
    }
  } else {
    throw createError(
      "Documents can only be uploaded to draft claims or corrected on returned claims",
      409
    );
  }

  // -------------------------------------------------------
  // SAVE DOCUMENT AND RELATED DATABASE REFERENCES
  // -------------------------------------------------------

  const documentFilePath =
    `/uploads/claim-documents/${storedFileName}`;

  let document = null;

  try {
    document = await Document.create({
      faculty: facultyId,
      claim: claim._id,
      documentType: normalizedDocumentType,
      originalName: path.basename(
        file.originalname || storedFileName
      ),
      storedName: storedFileName,
      filePath: documentFilePath,
      mimeType: file.mimetype,
      fileSize: file.size,
      status: "UPLOADED",
      reviewComment: "",
      verifiedBy: null,
      verifiedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      replacesDocument: previousDocument
        ? previousDocument._id
        : null,
      replacedBy: null,
    });

    if (previousDocument) {
      // Conditional update prevents overwriting a replacement
      // link created by another request.
      const previousUpdate = await Document.updateOne(
        {
          _id: previousDocument._id,
          claim: claim._id,
          faculty: facultyId,
          replacedBy: null,
          ...(claim.status === "RETURNED"
            ? { status: "REJECTED" }
            : {}),
        },
        {
          $set: { replacedBy: document._id },
        }
      );

      if (previousUpdate.modifiedCount !== 1) {
        throw createError(
          "The original document has already changed. Refresh and try again.",
          409
        );
      }
    }

    const claimUpdate = await Claim.updateOne(
      {
        _id: claim._id,
        faculty: facultyId,
        status: claim.status,
      },
      {
        $addToSet: { documents: document._id },
      }
    );

    if (claimUpdate.matchedCount !== 1) {
      throw createError(
        "The claim changed while the document was being uploaded. Refresh and try again.",
        409
      );
    }
  } catch (operationError) {
    /*
     * Compensate for partial database writes.
     *
     * If rollback cannot be confirmed, tell the controller
     * to preserve the uploaded file. Deleting a file that
     * might still have a database record would be unsafe.
     */

    let rollbackComplete = true;

    if (document && previousDocument) {
      try {
        await Document.updateOne(
          {
            _id: previousDocument._id,
            replacedBy: document._id,
          },
          {
            $set: { replacedBy: null },
          }
        );

        const previousState = await Document.findById(
          previousDocument._id
        ).select("_id replacedBy");

        if (
          !previousState ||
          (previousState.replacedBy &&
            previousState.replacedBy.toString() ===
              document._id.toString())
        ) {
          rollbackComplete = false;
        }
      } catch (rollbackError) {
        rollbackComplete = false;

        console.error(
          "Unable to restore previous document link:",
          rollbackError.message
        );
      }
    }

    if (document && rollbackComplete) {
      try {
        await Claim.updateOne(
          { _id: claim._id },
          { $pull: { documents: document._id } }
        );
      } catch (rollbackError) {
        rollbackComplete = false;

        console.error(
          "Unable to remove document reference from claim:",
          rollbackError.message
        );
      }
    }

    if (document && rollbackComplete) {
      try {
        await Document.deleteOne({ _id: document._id });

        const remainingDocument = await Document.exists({
          _id: document._id,
        });

        if (remainingDocument) {
          rollbackComplete = false;
        }
      } catch (rollbackError) {
        rollbackComplete = false;

        console.error(
          "Unable to roll back new document record:",
          rollbackError.message
        );
      }
    }

    if (document) {
      operationError.documentCreated = !rollbackComplete;

      if (rollbackComplete) {
        operationError.documentCreated = false;
      } else {
        console.error(
          "Upload rollback was incomplete. Preserve the physical file for recovery."
        );
      }
    }

    throw operationError;
  }

  // -------------------------------------------------------
  // NOTIFY FACULTY
  // -------------------------------------------------------

  try {
    await notifyDocumentUploaded({
      facultyId: claim.faculty,
      claimId: claim._id,
      documentType: document.documentType,
    });
  } catch (error) {
    // Do not fail an upload that has already been saved.
    console.error(
      "Document uploaded, but notification creation failed:",
      error.message
    );
  }

  return document;
};

// =========================================================
// REJECT AN INDIVIDUAL CLAIM DOCUMENT
// =========================================================

const rejectDocument = async ({
  adminId,
  claimId,
  documentId,
  reason,
}) => {
  validateObjectId(adminId, "Invalid Admin ID");
  validateObjectId(claimId, "Invalid claim ID");
  validateObjectId(documentId, "Invalid document ID");

  if (typeof reason !== "string" || !reason.trim()) {
    throw createError("A rejection reason is required", 400);
  }

  const normalizedReason = reason.trim();

  if (normalizedReason.length > 2000) {
    throw createError(
      "The rejection reason cannot exceed 2000 characters",
      400
    );
  }

  const claim = await Claim.findById(claimId).select(
    "_id faculty status claimType"
  );

  if (!claim) {
    throw createError("Claim not found", 404);
  }

  if (
    !["SUBMITTED", "UNDER_REVIEW", "RETURNED"].includes(
      claim.status
    )
  ) {
    throw createError(
      "Documents can only be rejected while the claim is submitted, under review, or returned for correction",
      409
    );
  }

  const document = await Document.findOne({
    _id: documentId,
    claim: claim._id,
    faculty: claim.faculty,
    replacedBy: null,
    status: { $in: ["UPLOADED", "VERIFIED"] },
  });

  if (!document) {
    throw createError(
      "Document not found or it is no longer eligible for rejection",
      404
    );
  }

  document.status = "REJECTED";
  document.reviewComment = normalizedReason;
  document.rejectedBy = adminId;
  document.rejectedAt = new Date();
  document.verifiedBy = null;
  document.verifiedAt = null;

  await document.save();

  try {
    await createNotification({
      recipient: claim.faculty,
      type: "DOCUMENT_REJECTED",
      title: "Document rejected",
      message:
        `Your ${document.documentType} document was rejected. ` +
        `Reason: ${normalizedReason}`,
      claim: claim._id,
      metadata: {
        documentId: document._id.toString(),
        documentType: document.documentType,
        reason: normalizedReason,
      },
    });
  } catch (error) {
    console.error(
      "Document rejected, but notification creation failed:",
      error.message
    );
  }

  return document;
};

// =========================================================
// GET FACULTY DOCUMENTS
// =========================================================

const getFacultyDocuments = async ({
  facultyId,
  claimId,
  status,
}) => {
  validateObjectId(facultyId, "Invalid faculty ID");

  const query = { faculty: facultyId };

  if (claimId) {
    validateObjectId(claimId, "Invalid claim ID");
    query.claim = claimId;
  }

  if (status) {
    const allowedStatuses = [
      "UPLOADED",
      "VERIFIED",
      "REJECTED",
    ];

    if (!allowedStatuses.includes(status)) {
      throw createError("Invalid document status filter", 400);
    }

    query.status = status;
  }

  return Document.find(query)
    .populate(
      "claim",
      "claimType status financialYear incentiveAmount"
    )
    .populate(
      "replacesDocument",
      "documentType originalName status reviewComment rejectedAt rejectedBy"
    )
    .populate(
      "replacedBy",
      "documentType originalName status createdAt"
    )
    .populate("rejectedBy", "name email")
    .sort({ createdAt: -1 });
};

// =========================================================
// GET ONE FACULTY DOCUMENT
// =========================================================

const getFacultyDocumentById = async ({
  facultyId,
  documentId,
}) => {
  validateObjectId(facultyId, "Invalid faculty ID");
  validateObjectId(documentId, "Invalid document ID");

  const document = await Document.findOne({
    _id: documentId,
    faculty: facultyId,
  })
    .populate(
      "claim",
      "claimType status financialYear"
    )
    .populate(
      "replacesDocument",
      "documentType originalName status reviewComment rejectedAt"
    )
    .populate(
      "replacedBy",
      "documentType originalName status createdAt"
    )
    .populate("rejectedBy", "name email");

  if (!document) {
    throw createError("Document not found", 404);
  }

  return document;
};

// =========================================================
// DELETE DRAFT DOCUMENT
// =========================================================

const deleteDocument = async ({
  facultyId,
  documentId,
}) => {
  validateObjectId(facultyId, "Invalid faculty ID");
  validateObjectId(documentId, "Invalid document ID");

  const document = await Document.findOne({
    _id: documentId,
    faculty: facultyId,
  });

  if (!document) {
    throw createError("Document not found", 404);
  }

  const claim = await Claim.findOne({
    _id: document.claim,
    faculty: facultyId,
  });

  if (!claim) {
    throw createError("Associated claim not found", 404);
  }

  if (claim.status !== "DRAFT") {
    throw createError(
      "Documents can only be permanently removed from draft claims. Documents on submitted or returned claims must be preserved for review history.",
      409
    );
  }

  if (document.replacesDocument || document.replacedBy) {
    throw createError(
      "Documents linked to a replacement history cannot be permanently deleted",
      409
    );
  }

  const physicalFilePath = resolveStoredFilePath(document);

  /*
   * Remove database references before attempting physical
   * cleanup. If database deletion fails, restore the claim
   * reference. A leftover physical file is preferable to
   * a database record pointing to a missing file.
   */

  const claimUpdate = await Claim.updateOne(
    {
      _id: claim._id,
      faculty: facultyId,
      status: "DRAFT",
    },
    {
      $pull: { documents: document._id },
    }
  );

  if (claimUpdate.matchedCount !== 1) {
    throw createError(
      "The claim changed while deleting the document. Refresh and try again.",
      409
    );
  }

  try {
    await Document.deleteOne({
      _id: document._id,
      faculty: facultyId,
      claim: claim._id,
      replacesDocument: null,
      replacedBy: null,
    });
  } catch (deleteError) {
    try {
      await Claim.updateOne(
        { _id: claim._id },
        { $addToSet: { documents: document._id } }
      );
    } catch (rollbackError) {
      console.error(
        "Unable to restore claim document reference:",
        rollbackError.message
      );
    }

    throw deleteError;
  }

  const remainingDocument = await Document.exists({
    _id: document._id,
  });

  if (remainingDocument) {
    try {
      await Claim.updateOne(
        { _id: claim._id },
        { $addToSet: { documents: document._id } }
      );
    } catch (rollbackError) {
      console.error(
        "Unable to restore claim reference after incomplete deletion:",
        rollbackError.message
      );
    }

    throw createError(
      "The document record could not be removed",
      500
    );
  }

  // Physical cleanup occurs only after the database record
  // has been removed. A failed cleanup leaves an orphaned
  // file, which should be logged and cleaned up separately.
  try {
    await fs.promises.unlink(physicalFilePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(
        "Document record was deleted, but physical file cleanup failed:",
        error.message
      );
    }
  }

  return true;
};

// =========================================================
// GET PHYSICAL DOCUMENT FILE PATH — FACULTY
// =========================================================

const getDocumentFilePath = async ({
  facultyId,
  documentId,
}) => {
  validateObjectId(facultyId, "Invalid faculty ID");
  validateObjectId(documentId, "Invalid document ID");

  const document = await Document.findOne({
    _id: documentId,
    faculty: facultyId,
  });

  if (!document) {
    throw createError("Document not found", 404);
  }

  const filePath = resolveStoredFilePath(document);

  await verifyPhysicalFileExists(filePath);

  return { document, filePath };
};

// =========================================================
// GET PHYSICAL DOCUMENT FILE PATH — ADMIN
// =========================================================

const getAdminClaimDocumentFilePath = async ({
  claimId,
  documentId,
}) => {
  validateObjectId(claimId, "Invalid claim ID");
  validateObjectId(documentId, "Invalid document ID");

  const claim = await Claim.findById(claimId).select(
    "_id faculty status documents"
  );

  if (!claim || claim.status === "DRAFT") {
    throw createError("Claim not found", 404);
  }

  const document = await Document.findOne({
    _id: documentId,
    claim: claim._id,
    faculty: claim.faculty,
  });

  if (!document) {
    throw createError(
      "Document not found for this claim",
      404
    );
  }

  const isAttached = (claim.documents || []).some(
    (id) => id.toString() === document._id.toString()
  );

  if (!isAttached) {
    throw createError(
      "Document is not attached to this claim",
      404
    );
  }

  const filePath = resolveStoredFilePath(document);

  await verifyPhysicalFileExists(filePath);

  return { document, filePath };
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  validateUploadedFile,
  createDocument,
  rejectDocument,
  getFacultyDocuments,
  getFacultyDocumentById,
  deleteDocument,
  getDocumentFilePath,
  getAdminClaimDocumentFilePath,
};
