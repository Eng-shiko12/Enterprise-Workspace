const express = require('express');
const c = require('../controllers/authController');
const { authLimiter } = require('../middlewares/limiterMiddleware');
const Auth = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validationMiddleware');
const s = require('../validators/schemas');

const router = express.Router();

router.post('/register', authLimiter, validate(s.register), c.register);
router.post('/resend-otp', authLimiter, validate(s.emailOnly), c.resendOtp);
router.post('/verify-email', authLimiter, validate(s.otp), c.verifyEmail);
router.post('/login', authLimiter, validate(s.login), c.login);
router.post('/logout', Auth, c.logout);
router.post('/forget-password', authLimiter, validate(s.emailOnly), c.forgetPassword);
router.post('/verify-reset-otp', authLimiter, validate(s.otp), c.verifyResetOtp);
router.post('/reset-password', authLimiter, validate(s.resetPassword), c.resetPassword);

module.exports = router;
