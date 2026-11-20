const AppError = require('../utils/AppError');

const handleCastErrorDB = (err) => AppError(`Invalid ${err.path}: ${err.value}`, 400);
const handleDuplicateFieldsDB = (err) => {
    const field = Object.keys(err.keyValue || {})[0];
    return AppError(`${field ? `That ${field}` : 'That value'} is already in use`, 400);
};
const handleValidationErrorDB = (err) =>
    AppError(`Invalid input data. ${Object.values(err.errors).map((e) => e.message).join('. ')}`, 400);

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    let error = err;

    if (err.name === 'CastError') error = handleCastErrorDB(err);
    else if (err.code === 11000) error = handleDuplicateFieldsDB(err);
    else if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
    else if (err.name === 'JsonWebTokenError') error = AppError('Invalid token. Please log in again.', 401);
    else if (err.name === 'TokenExpiredError') error = AppError('Your session has expired. Please log in again.', 401);
    else if (err.type === 'entity.too.large') error = AppError('Request body is too large', 413);
    else if (err.type === 'entity.parse.failed') error = AppError('Malformed JSON body', 400);

    const statusCode = error.statusCode || 500;
    const isOperational = error.isOperational || statusCode < 500;

    // Never leak internals of unexpected errors in production
    if (!isOperational) console.error('💥 Unexpected error:', err);

    res.status(statusCode).json({
        success: false,
        status: statusCode < 500 ? 'fail' : 'error',
        message: isOperational || process.env.NODE_ENV !== 'production'
            ? error.message
            : 'Something went wrong on our side. Please try again later.',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
