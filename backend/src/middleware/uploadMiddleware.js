const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_SIZE,
} = require("../utils/constants");

const uploadDirectory = path.join(
  __dirname,
  "../../uploads/claim-documents"
);

/*
 * Make sure the upload directory exists.
 */
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

/*
 * Store uploaded files on the backend server.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(
      file.originalname
    );

    const baseName = path
      .basename(
        file.originalname,
        extension
      )
      .replace(/[^a-zA-Z0-9-_]/g, "_");

    const uniqueSuffix =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}`;

    cb(
      null,
      `${baseName}-${uniqueSuffix}${extension}`
    );
  },
});

/*
 * Validate file type before saving.
 */
const fileFilter = (
  req,
  file,
  cb
) => {
  if (
    !ALLOWED_DOCUMENT_TYPES.includes(
      file.mimetype
    )
  ) {
    return cb(
      new Error(
        "Invalid document format. Only PDF, JPG, JPEG, and PNG files are allowed"
      )
    );
  }

  cb(null, true);
};

/*
 * Multer configuration for claim documents.
 */
const uploadClaimDocument = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: MAX_DOCUMENT_SIZE,
  },
});

module.exports = {
  uploadClaimDocument,
};