const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    status: "error",
    message: err.message || "Something went wrong",
  });
};

module.exports = errorHandler;