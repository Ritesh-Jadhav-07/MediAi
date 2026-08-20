const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];

    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Database validation failed",
    });
  }

  return res.status(err.statusCode || 500).json({
    success: false,
    message:
      err.message || "Internal server error",
  });
};

export { errorMiddleware };