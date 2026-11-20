const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const createError = require('../utils/AppError');
const User = require('../models/userModel');

const Auth = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token || token === 'loggedout') {
        return next(createError('Authorization required. Please log in to get access.', 401));
    }

    // jwt.verify throws JsonWebTokenError / TokenExpiredError — mapped by the global error handler
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decoded.id).select('+isActive');
    if (!currentUser) {
        return next(createError('The user belonging to this token no longer exists.', 401));
    }
    if (currentUser.isActive === false) {
        return next(createError('This account has been deactivated. Please contact support.', 403));
    }

    req.user = currentUser;
    next();
});

module.exports = Auth;
