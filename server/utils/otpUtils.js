const crypto = require('crypto');

const generateSecureOTP = () => {
    const plainOTP = crypto.randomInt(100000, 999999).toString();
    const hashedOTP = crypto.createHash('sha256').update(plainOTP).digest('hex');
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    return { plainOTP, hashedOTP, otpExpires };
};

const verifyOTP = (plainOTP, storedHashedOTP) => {
    if (!plainOTP || !storedHashedOTP) return false;
    const computedHash = crypto.createHash('sha256').update(plainOTP).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(storedHashedOTP));
};

module.exports = {
    generateSecureOTP,
    verifyOTP
};