const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const createError = require('../utils/AppError');
const { generateSecureOTP, verifyOTP } = require('../utils/otpUtils');
const sendEmail = require('../utils/emailUtils');
const generateToken = require('../utils/tokenUtils');
const sendResponse = require('../utils/sendResponse');
const { setAuthCookie, clearAuthCookie } = require('../utils/cookies');

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const isDev = process.env.NODE_ENV !== 'production';

const sendOtpEmail = async (user, plainOTP, purpose) => {
    // Handy while developing without SMTP — never printed in production
    if (isDev) console.log(`🔑 [DEV ${purpose} OTP for ${user.email}]: ${plainOTP}`);

    const isVerify = purpose === 'verify';
    await sendEmail({
        email: user.email,
        subject: isVerify ? 'Vortex — Verify your email' : 'Vortex — Password reset code',
        text: `Your Vortex ${isVerify ? 'verification' : 'password reset'} code is ${plainOTP}. It is valid for 10 minutes.`
    });
};

const issueVerifyOtp = async (user) => {
    const { plainOTP, hashedOTP, otpExpires } = generateSecureOTP();
    user.emailVerifyOTP = hashedOTP;
    user.emailVerifyOTPExpires = otpExpires;
    await user.save({ validateBeforeSave: false });
    try {
        await sendOtpEmail(user, plainOTP, 'verify');
    } catch (err) {
        console.error('⚠️  Could not send verification email:', err.message);
    }
};

const register = asyncHandler(async (req, res, next) => {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
        return next(createError('Email is already in use. Please log in or use another email.', 400));
    }

    const user = await User.create({ name, email, password });
    await issueVerifyOtp(user);

    sendResponse(res, 201, true, 'Account created. Please check your email for the verification code.', {
        user: { _id: user._id, name: user.name, email: user.email }
    });
});

const resendOtp = asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+emailVerifyOTP');
    // Same response whether or not the account exists (no account enumeration)
    if (user && user.emailVerifyOTP) await issueVerifyOtp(user);
    sendResponse(res, 200, true, 'If that account is waiting for verification, a new code has been sent.');
});

const verifyEmail = asyncHandler(async (req, res, next) => {
    const { email, otp } = req.body;

    const user = await User.findOne({
        email,
        emailVerifyOTPExpires: { $gt: new Date() }
    }).select('+emailVerifyOTP +emailVerifyOTPExpires');

    if (!user || !user.emailVerifyOTP || !verifyOTP(otp, user.emailVerifyOTP)) {
        return next(createError('Invalid or expired code', 400));
    }

    user.emailVerifyOTP = undefined;
    user.emailVerifyOTPExpires = undefined;
    await user.save({ validateBeforeSave: false });

    sendResponse(res, 200, true, 'Email verified successfully. You can now log in.');
});

const login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select(
        '+password +isActive +emailVerifyOTP +failedLoginAttempts +lockUntil'
    );

    if (user && user.lockUntil && user.lockUntil > new Date()) {
        const minutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return next(createError(`Too many failed attempts. Try again in ${minutes} minute(s).`, 423));
    }

    const passwordOk = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !passwordOk) {
        if (user) {
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
            if (user.failedLoginAttempts >= MAX_FAILED_LOGINS) {
                user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
                user.failedLoginAttempts = 0;
            }
            await user.save({ validateBeforeSave: false });
        }
        return next(createError('Incorrect email or password', 401));
    }

    if (user.emailVerifyOTP) {
        return next(createError('Please verify your email first using the code we sent you.', 403));
    }
    if (user.isActive === false) {
        return next(createError('This account has been deactivated.', 403));
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    sendResponse(res, 200, true, 'Logged in successfully', { user: user.toJSON() }, { token });
});

const logout = asyncHandler(async (req, res) => {
    clearAuthCookie(res);
    sendResponse(res, 200, true, 'Logged out successfully');
});

const forgetPassword = asyncHandler(async (req, res) => {
    const generic = 'If that email exists, a password reset code has been sent.';
    const user = await User.findOne({ email: req.body.email });
    if (!user) return sendResponse(res, 200, true, generic);

    const { plainOTP, hashedOTP, otpExpires } = generateSecureOTP();
    user.passwordResetOTP = hashedOTP;
    user.passwordResetOTPExpires = otpExpires;
    user.isPasswordResetVerified = false;
    await user.save({ validateBeforeSave: false });

    try {
        await sendOtpEmail(user, plainOTP, 'reset');
    } catch (err) {
        console.error('⚠️  Could not send reset email:', err.message);
        if (!isDev) {
            user.passwordResetOTP = undefined;
            user.passwordResetOTPExpires = undefined;
            await user.save({ validateBeforeSave: false });
            throw createError('We could not send the email. Please try again later.', 500);
        }
    }

    sendResponse(res, 200, true, generic);
});

const verifyResetOtp = asyncHandler(async (req, res, next) => {
    const { email, otp } = req.body;

    const user = await User.findOne({
        email,
        passwordResetOTPExpires: { $gt: new Date() }
    }).select('+passwordResetOTP +passwordResetOTPExpires');

    if (!user || !user.passwordResetOTP || !verifyOTP(otp, user.passwordResetOTP)) {
        return next(createError('Invalid or expired code', 400));
    }

    user.passwordResetOTP = undefined;
    user.isPasswordResetVerified = true;
    // the "verified" flag itself expires so an abandoned reset cannot be completed later
    user.passwordResetOTPExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    sendResponse(res, 200, true, 'Code verified. You can now choose a new password.');
});

const resetPassword = asyncHandler(async (req, res, next) => {
    const { password, email } = req.body;

    const user = await User.findOne({ email }).select('+isPasswordResetVerified +passwordResetOTPExpires');

    if (!user || !user.isPasswordResetVerified || !user.passwordResetOTPExpires || user.passwordResetOTPExpires < new Date()) {
        return next(createError('Please verify the code we emailed you first.', 401));
    }

    user.password = password;
    user.isPasswordResetVerified = false;
    user.passwordResetOTPExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    sendResponse(res, 200, true, 'Password reset successfully. You can now log in.');
});

module.exports = { register, resendOtp, verifyEmail, login, logout, verifyResetOtp, forgetPassword, resetPassword };
