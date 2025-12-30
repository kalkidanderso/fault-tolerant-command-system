/**
 * Control Server - Main Entry Point
 */

import express, { Express } from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initializeSchema } from './database/schema';
import { CommandRepository } from './database/repository';
import { CommandService } from './services/commandService';
import { createCommandRoutes } from './routes/commands';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

/**
 * Configuration
 */
const PORT = parseInt(process.env.SERVER_PORT || '3000', 10);
const HOST = process.env.SERVER_HOST || '0.0.0.0';
const DB_PATH = process.env.DATABASE_PATH || './data/commands.db';

/**
 * Initialize database
 */
function initializeDatabase(): Database.Database {
    // Ensure data directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        logger.info('Created database directory', { path: dbDir });
    }

    // Open database
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    db.pragma('foreign_keys = ON');

    logger.info('Database opened', { path: DB_PATH });

    // Initialize schema
    initializeSchema(db);

    return db;
}

/**
 * Create Express application
 */
function createApp(commandService: CommandService): Express {
    const app = express();

    // Middleware
    app.use(express.json());

    // Request logging
    app.use((req, _res, next) => {
        logger.info('Incoming request', {
            method: req.method,
            path: req.path,
            ip: req.ip,
        });
        next();
    });

    // Routes
    app.use('/commands', createCommandRoutes(commandService));

    // Health check at root
    app.get('/health', (_req, res) => {
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Error handlers
    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}

/**
 * Main function
 */
function main(): void {
    logger.info('Starting Control Server');

    // Initialize database
    const db = initializeDatabase();

    // Create repository and service
    const repository = new CommandRepository(db);
    const commandService = new CommandService(repository);

    // Recover stale commands from previous crashes
    commandService.recoverStaleCommands();

    // Create Express app
    const app = createApp(commandService);

    // Start server
    const server = app.listen(PORT, HOST, () => {
        logger.info('Server started', {
            host: HOST,
            port: PORT,
            env: process.env.NODE_ENV || 'development',
        });
    });

    // Graceful shutdown
    const shutdown = (): void => {
        logger.info('Shutting down server');

        server.close(() => {
            logger.info('Server closed');
            db.close();
            logger.info('Database closed');
            process.exit(0);
        });

        // Force shutdown after 10 seconds
        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception', { error: error.message, stack: error.stack });
        shutdown();
    });

    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled rejection', { reason });
        shutdown();
    });
}

// Start server
main();
