
const fs = require("fs");
const mongoose = require("mongoose");

const {
  createDocument,
  getFacultyDocuments,
  getFacultyDocumentById,
  deleteDocument,
  getDocumentFilePath,
} = require("../services/documentService");

const {
  successResponse,
  errorResponse,
} = require("../utils/responseHelpers");

// =========================================================
// UPLOAD DOCUMENT OR REPLACEMENT
// =========================================================

const uploadDocument = async (req, res) => {
  try {
    const facultyId = req.user.userId;

    const {
      claimId,
      documentType,
      replacesDocumentId,
    } = req.body;

    if (!claimId) {
      return errorResponse(
        res,
        400,
        "Claim ID is required"
      );
    }

    if (!mongoose.Types.ObjectId.isValid(claimId)) {
      return errorResponse(
        res,
        400,
        "Invalid claim ID"
      );
    }

    if (
      typeof documentType !== "string" ||
      !documentType.trim()
    ) {
      return errorResponse(
        res,
        400,
        "Document type is required"
      );
    }

    if (!req.file) {
      return errorResponse(
        res,
        400,
        "Document file is required"
      );
    }

    if (
      replacesDocumentId &&
      !mongoose.Types.ObjectId.isValid(
        replacesDocumentId
      )
    ) {
      return errorResponse(
        res,
        400,
        "Invalid replacement document ID"
      );
    }

    const document = await createDocument({
      facultyId,
      claimId,
      documentType,
      file: req.file,
      replacesDocumentId: replacesDocumentId || undefined,
    });

    return successResponse(
      res,
      201,
      replacesDocumentId
        ? "Replacement document uploaded successfully"
        : "Document uploaded successfully",
      {
        document,
      }
    );
  } catch (error) {
    console.error(
      "Upload document error:",
      error.message
    );

    /*
     * Clean up the uploaded file if the upload
     * operation failed before it was saved.
     *
     * Do not delete a file belonging to a document
     * record that was successfully created.
     */
    if (req.file?.path && !error.documentCreated) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (fileError) {
        if (fileError.code !== "ENOENT") {
          console.error(
            "Unable to clean up uploaded file:",
            fileError.message
          );
        }
      }
    }

    return errorResponse(
      res,
      error.statusCode || 400,
      error.message || "Unable to upload document"
    );
  }
};

// =========================================================
// GET ALL FACULTY DOCUMENTS
// =========================================================

const getDocuments = async (req, res) => {
  try {
    const facultyId = req.user.userId;
    const { claimId, status } = req.query;

    if (
      claimId &&
      !mongoose.Types.ObjectId.isValid(claimId)
    ) {
      return errorResponse(
        res,
        400,
        "Invalid claim ID"
      );
    }

    const documents = await getFacultyDocuments({
      facultyId,
      claimId,
      status,
    });

    return successResponse(
      res,
      200,
      "Documents retrieved successfully",
      { documents }
    );
  } catch (error) {
    console.error(
      "Get documents error:",
      error.message
    );

    return errorResponse(
      res,
      error.statusCode || 500,
      error.message || "Unable to retrieve documents"
    );
  }
};

// =========================================================
// GET ONE DOCUMENT
// =========================================================

const getDocumentById = async (req, res) => {
  try {
    const facultyId = req.user.userId;
    const { documentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return errorResponse(
        res,
        400,
        "Invalid document ID"
      );
    }

    const document = await getFacultyDocumentById({
      facultyId,
      documentId,
    });

    return successResponse(
      res,
      200,
      "Document retrieved successfully",
      { document }
    );
  } catch (error) {
    console.error(
      "Get document error:",
      error.message
    );

    return errorResponse(
      res,
      error.statusCode || 500,
      error.message || "Unable to retrieve document"
    );
  }
};

// =========================================================
// DOWNLOAD / VIEW DOCUMENT
// =========================================================

const downloadDocument = async (req, res) => {
  try {
    const facultyId = req.user.userId;
    const { documentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return errorResponse(
        res,
        400,
        "Invalid document ID"
      );
    }

    const { document, filePath } =
      await getDocumentFilePath({
        facultyId,
        documentId,
      });

    res.setHeader("Content-Type", document.mimeType);

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(
        document.originalName
      )}"`
    );

    return res.sendFile(filePath, (error) => {
      if (error) {
        console.error(
          "Document file response error:",
          error.message
        );

        if (!res.headersSent) {
          return res.status(404).json({
            success: false,
            message: "Document file could not be retrieved",
          });
        }
      }
    });
  } catch (error) {
    console.error(
      "Download document error:",
      error.message
    );

    return errorResponse(
      res,
      error.statusCode || 500,
      error.message || "Unable to retrieve document file"
    );
  }
};

// =========================================================
// DELETE DOCUMENT
// =========================================================

const removeDocument = async (req, res) => {
  try {
    const facultyId = req.user.userId;
    const { documentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return errorResponse(
        res,
        400,
        "Invalid document ID"
      );
    }

    await deleteDocument({
      facultyId,
      documentId,
    });

    return successResponse(
      res,
      200,
      "Document deleted successfully"
    );
  } catch (error) {
    console.error(
      "Delete document error:",
      error.message
    );

    return errorResponse(
      res,
      error.statusCode || 400,
      error.message || "Unable to delete document"
    );
  }
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById,
  downloadDocument,
  removeDocument,
};
