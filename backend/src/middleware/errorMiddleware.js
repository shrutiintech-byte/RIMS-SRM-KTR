
const multer = require("multer");

const errorMiddleware = (
  error,
  req,
  res,
  next
) => {
  console.error(
    "Backend error:",
    error.message || error
  );

  /*
   * Handle Multer upload errors.
   */
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size cannot exceed 10 MB",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  /*
   * Handle custom file validation errors.
   */
  if (
    error.message &&
    error.message.includes("Invalid document format")
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  /*
   * Handle invalid JSON sent to Express.
   */
  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    error.type === "entity.parse.failed"
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body",
    });
  }

  /*
   * Handle Mongoose validation errors.
   */
  if (error.name === "ValidationError") {
    const errors = Object.values(
      error.errors || {}
    ).map((item) => ({
      field: item.path,
      message: item.message,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  /*
   * Handle invalid MongoDB ObjectIds.
   */
  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid resource ID",
    });
  }

  /*
   * Handle duplicate MongoDB records.
   */
  if (error.code === 11000) {
    const duplicateFields = Object.keys(
      error.keyPattern || {}
    );

    return res.status(409).json({
      success: false,
      message:
        "A record with the provided information already exists",
      errors: duplicateFields,
    });
  }

  /*
   * Handle application errors with explicit
   * client-error status codes.
   */
  const statusCode = Number(error.statusCode);

  if (
    Number.isInteger(statusCode) &&
    statusCode >= 400 &&
    statusCode < 500
  ) {
    return res.status(statusCode).json({
      success: false,
      message:
        error.message ||
        "The request could not be completed",
      ...(error.code
        ? { code: error.code }
        : {}),
    });
  }

  /*
   * Handle unexpected server errors without
   * exposing internal implementation details.
   */
  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

module.exports = {
  errorMiddleware,
};
