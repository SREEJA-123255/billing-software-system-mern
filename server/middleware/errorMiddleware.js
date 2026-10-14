// 404 Not Found Middleware
const notFound = (req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Centralized Global Error Handler
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || "Internal Server Error";
  let errors = null;

  // Handle Mongoose CastError (Invalid ObjectId)
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found. Invalid ID format.";
  }

  // Handle Mongoose Validation Error
  if (err.name === "ValidationError") {
    statusCode = 422;
    message = "Validation failed";
    errors = {};
    Object.keys(err.errors).forEach((key) => {
      errors[key] = err.errors[key].message;
    });
  }

  // Handle MongoDB Duplicate Key (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    if (field === "email") {
      message = "Email address is already registered";
    } else {
      message = `Duplicate value entered for ${field}`;
    }
  }

  // Handle Multer upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 422;
    message = "File size exceeds limit (maximum allowed: 5MB)";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
};

module.exports = {
  notFound,
  errorHandler
};