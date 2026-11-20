const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide your name'],
        trim: true,
        maxlength: 60
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false
    },
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true, select: false },

    // OTP / reset state is never returned to API consumers
    emailVerifyOTP: { type: String, select: false },
    emailVerifyOTPExpires: { type: Date, select: false },
    passwordResetOTP: { type: String, select: false },
    passwordResetOTPExpires: { type: Date, select: false },
    isPasswordResetVerified: { type: Boolean, default: false, select: false },

    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    lastLogin: Date
}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            delete ret.__v;
            ['password', 'isActive', 'failedLoginAttempts', 'lockUntil', 'emailVerifyOTP',
                'emailVerifyOTPExpires', 'passwordResetOTP', 'passwordResetOTPExpires',
                'isPasswordResetVerified'].forEach((f) => delete ret[f]);
            return ret;
        }
    }
});

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

module.exports = mongoose.model('User', userSchema);
