const http = require('http');
const mongoose = require('mongoose');
const { config, validateEnv } = require('./config/env');

validateEnv();

const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./sockets/socketHandler');

const startServer = async () => {
    await connectDB();

    const server = http.createServer(app);
    initSocket(server);

    server.listen(config.port, () => {
        console.log(`🚀 Vortex API listening on :${config.port} [${config.nodeEnv}]`);
    });

    // Graceful shutdown: stop accepting connections, then close Mongo
    let shuttingDown = false;
    const shutdown = (signal, code = 0) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);

        const force = setTimeout(() => {
            console.error('❌ Could not close connections in time, forcing shutdown.');
            process.exit(1);
        }, 10000);
        force.unref();

        server.close(async () => {
            await mongoose.connection.close().catch(() => {});
            console.log('✅ Server closed.');
            process.exit(code);
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('unhandledRejection', (err) => {
        console.error('💥 UNHANDLED REJECTION:', err);
        shutdown('unhandledRejection', 1);
    });
    process.on('uncaughtException', (err) => {
        console.error('💥 UNCAUGHT EXCEPTION:', err);
        shutdown('uncaughtException', 1);
    });
};

startServer().catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});
