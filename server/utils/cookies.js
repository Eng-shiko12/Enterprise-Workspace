const { config } = require('../config/env');

const base = () => ({
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    ...(config.cookie.domain && { domain: config.cookie.domain })
});

const setAuthCookie = (res, token) =>
    res.cookie('jwt', token, { ...base(), maxAge: config.cookie.maxAgeMs });

const clearAuthCookie = (res) => res.clearCookie('jwt', base());

module.exports = { setAuthCookie, clearAuthCookie };
