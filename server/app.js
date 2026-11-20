const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');

const { config } = require('./config/env');
const apiLimiter = require('./middlewares/limiterMiddleware');
const morganMiddleware = require('./middlewares/LoggerMiddleware');
const sanitize = require('./middlewares/sanitizeMiddleware');
const errorHandler = require('./middlewares/errorMiddleware');
const createError = require('./utils/AppError');

const authRoutes = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const boardRoutes = require('./routes/boardRoutes');
const listRoutes = require('./routes/listRoutes');
const cardRoutes = require('./routes/cardRoutes');
const searchRoutes = require('./routes/searchRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Behind Render / Railway / nginx / a load balancer the real client IP is in X-Forwarded-For.
// Required for correct rate-limiting and secure cookies.
app.set('trust proxy', config.trustProxy);
app.disable('x-powered-by');

// ─── Security & performance ──────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: (origin, cb) => {
        // no Origin header = same-origin / curl / server-to-server
        if (!origin || config.clientOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use(sanitize);
app.use(morganMiddleware);

// ─── Health ──────────────────────────────────────────────────────────
// liveness: the process is up
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Vortex API is healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv
    });
});
// readiness: the database is connected (use this for load balancers / orchestrators)
app.get('/ready', (req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ success: ready, database: ready ? 'connected' : 'unavailable' });
});

app.get('/', (req, res) => {
    res.status(200).json({ success: true, message: 'Vortex — Project & Sprint Management API', version: '2.0.0', docs: '/api/v1' });
});

// ─── API ─────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/workspaces', projectRoutes);
app.use('/api/v1/workspaces', boardRoutes);
app.use('/api/v1/workspaces', listRoutes);
app.use('/api/v1/workspaces', cardRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/search', searchRoutes);

// ─── 404 + errors ────────────────────────────────────────────────────
app.all(/(.*)/, (req, res, next) => {
    next(createError(`Can't find ${req.originalUrl} on this server`, 404));
});
app.use(errorHandler);

module.exports = app;
