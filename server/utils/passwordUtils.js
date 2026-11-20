const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const createError = require('./AppError');

const verifyPasswordAndGetUser = async (email, password) => {
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw createError('Incorrect email or password', 401);
    }

    return user;
};

module.exports = verifyPasswordAndGetUser;