const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Always read server/.env, no matter which folder the process was started from
const ENV_PATH = path.join(__dirname, '..', '.env');
const envFileFound = fs.existsSync(ENV_PATH);
dotenv.config({ path: ENV_PATH, quiet: true });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

const list = (value, fallback = []) =>
    (value ? value.split(',').map((v) => v.trim().replace(/\/$/, '')).filter(Boolean) : fallback);

const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();

const config = {
    nodeEnv,
    isProd,
    port: Number(process.env.PORT) || 5000,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    // FRONTEND_URL accepts one origin or a comma separated list
    clientOrigins: list(process.env.FRONTEND_URL, ['http://localhost:5173']),
    // Number of reverse proxies in front of the app (needed for rate-limit + secure cookies)
    trustProxy: process.env.TRUST_PROXY !== undefined ? Number(process.env.TRUST_PROXY) : (isProd ? 1 : 0),
    cookie: {
        sameSite,
        // browsers reject SameSite=None cookies that are not Secure
        secure: process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : isProd || sameSite === 'none',
        domain: process.env.COOKIE_DOMAIN || undefined,
        maxAgeMs: 7 * 24 * 60 * 60 * 1000
    },
    rateLimit: {
        apiMax: Number(process.env.RATE_LIMIT_MAX) || 600,
        authMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 30
    }
};

/**
 * Fail fast on a mis-configured deployment instead of crashing later at runtime.
 */
const validateEnv = () => {
    const problems = [];
    if (!config.mongoUri) problems.push('MONGO_URI is required');
    if (!config.jwtSecret) problems.push('JWT_SECRET is required');
    if (isProd && config.jwtSecret && config.jwtSecret.length < 32) {
        problems.push('JWT_SECRET must be at least 32 characters in production');
    }
    if (!['lax', 'strict', 'none'].includes(sameSite)) {
        problems.push('COOKIE_SAMESITE must be one of: lax, strict, none');
    }
    if (config.mongoUri && /^["']|["']$/.test(config.mongoUri.trim())) {
        problems.push('MONGO_URI contains quotes — remove the surrounding " or \' characters');
    }
    if (config.mongoUri && /^mongodb(\+srv)?:\/\/[^/]+(\/)?(\?|$)/.test(config.mongoUri)) {
        console.warn('⚠️  MONGO_URI has no database name (…mongodb.net/<name>?…) — MongoDB will use the default "test" database');
    }
    if (process.env.EMAIL_PASSWORD && /\s/.test(process.env.EMAIL_PASSWORD) && !isProd) {
        console.warn('⚠️  EMAIL_PASSWORD contains spaces — remove them from the Gmail app password');
    }
    if (isProd && config.clientOrigins.some((o) => o.includes('localhost'))) {
        console.warn('⚠️  FRONTEND_URL still points to localhost while NODE_ENV=production');
    }
    if (problems.length) {
        const hint = envFileFound
            ? `Found ${ENV_PATH}, but the variables above are missing/empty in it.`
            : `No .env file found. Create it at exactly:\n   ${ENV_PATH}\n   (copy .env.example to .env — on Windows make sure it is not saved as ".env.txt" or "env")`;
        throw new Error(`Invalid environment configuration:\n - ${problems.join('\n - ')}\n\n${hint}`);
    }
};

module.exports = { config, validateEnv };
