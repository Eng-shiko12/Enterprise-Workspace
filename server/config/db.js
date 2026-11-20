const mongoose = require('mongoose');
const { config } = require('./env');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongoUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 8000,
            socketTimeoutMS: 45000
        });
        console.log(`🍃 MongoDB connected: ${conn.connection.host}`);

        mongoose.connection.on('error', (err) => console.error('MongoDB error:', err));
        mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
    } catch (error) {
        throw new Error(`MongoDB connection failed: ${error.message}`);
    }
};

module.exports = connectDB;
