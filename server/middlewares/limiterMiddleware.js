const rateLimit = require('express-rate-limit');
const { config } = require('../config/env');

const handler = (message) => (req, res) =>
    res.status(429).json({ success: false, status: 'fail', message });

// General API limiter (per IP)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.rateLimit.apiMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: handler('Too many requests from this IP, please try again in a few minutes')
});

// Stricter limiter for credential endpoints (login, register, OTP, reset)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.rateLimit.authMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: handler('Too many authentication attempts. Please try again in 15 minutes')
});

module.exports = apiLimiter;
module.exports.authLimiter = authLimiter;
