const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Profile photo storage directory
const profilePhotoDirectory = path.join(
  __dirname,
  "../../uploads/profile-photos"
);

// Create the directory if it does not exist
if (!fs.existsSync(profilePhotoDirectory)) {
  fs.mkdirSync(profilePhotoDirectory, {
    recursive: true,
  });
}

// Store files using generated names
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePhotoDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const uniqueName = `profile-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${extension}`;

    cb(null, uniqueName);
  },
});

// Allow only supported image MIME types
const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

// Validate the uploaded file
const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new Error(
        "Only JPG, PNG, and WebP profile photographs are allowed."
      )
    );
  }

  cb(null, true);
};

// Maximum profile photo size: 2 MB
const uploadProfilePhoto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

module.exports = {
  uploadProfilePhoto,
};