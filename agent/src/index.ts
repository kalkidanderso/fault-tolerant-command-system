/**
 * Agent - Main Entry Point
 */

import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid'; // Generate agent ID if not provided
import { createLogger } from './utils/logger';
import { Poller } from './poller';
import { CrashSimulator } from './crashSimulator';
import { Reporter } from './reporter';
import { AgentConfig } from './types';

// CLI definition
const program = new Command();

program
    .name('agent')
    .description('Fault-tolerant command execution agent')
    .option('--server-url <url>', 'Control Server URL', process.env.SERVER_URL || 'http://localhost:3000')
    .option('--agent-id <id>', 'Unique Agent ID', process.env.AGENT_ID || `agent-${uuidv4().substring(0, 8)}`)
    .option('--kill-after <cycles>', 'Crash after N polling cycles', parseInt)
    .option('--random-failures', 'Enable random crashes', false)
    .parse(process.argv);

const options = program.opts();

// Configuration
const config: AgentConfig = {
    agentId: options.agentId,
    serverUrl: options.serverUrl,
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '1000', 10),
    maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10),
    httpTimeoutMs: parseInt(process.env.HTTP_TIMEOUT_MS || '30000', 10),
    killAfter: options.killAfter,
    randomFailures: options.randomFailures,
};

// Initialize components
const logger = createLogger(config.agentId);
const crashSimulator = new CrashSimulator(logger, config.killAfter, config.randomFailures);
const reporter = new Reporter(config, logger);
const poller = new Poller(config, logger, crashSimulator, reporter);

// Handle graceful shutdown
const shutdown = () => {
    logger.info('Shutting down agent');
    poller.stop();
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start
logger.info('Agent starting', {
    agentId: config.agentId,
    serverUrl: config.serverUrl,
    killAfter: config.killAfter,
    randomFailures: config.randomFailures
});

poller.start();
