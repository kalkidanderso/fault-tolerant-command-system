/**
 * Main polling mechanism
 */

import axios from 'axios';
import { AgentConfig, Command } from './types';
import { Logger } from './utils/logger';
import { executeCommand } from './executors';
import { CrashSimulator } from './crashSimulator';
import { Reporter } from './reporter';

export class Poller {
    private config: AgentConfig;
    private logger: Logger;
    private crashSimulator: CrashSimulator;
    private reporter: Reporter;
    private isRunning: boolean = false;


    constructor(
        config: AgentConfig,
        logger: Logger,
        crashSimulator: CrashSimulator,
        reporter: Reporter
    ) {
        this.config = config;
        this.logger = logger;
        this.crashSimulator = crashSimulator;
        this.reporter = reporter;
    }

    start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.logger.info('Agent started polling', {
            url: this.config.serverUrl,
            interval: this.config.pollIntervalMs
        });
        this.pollLoop();
    }

    stop(): void {
        this.isRunning = false;
    }

    private async pollLoop(): Promise<void> {
        while (this.isRunning) {
            try {
                // Checking for crash simulation
                this.crashSimulator.check();

                // fetch command
                const command = await this.fetchNextCommand();

                if (command) {
                    await this.processCommand(command);
                } else {
                    // No work, wait before next poll
                    await new Promise(resolve => setTimeout(resolve, this.config.pollIntervalMs));
                }

            } catch (error: any) {
                this.logger.error('Error in poll loop', { error: error.message });
                // Wait a bit on error to avoid tight loops
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    private async fetchNextCommand(): Promise<Command | null> {
        try {
            const response = await axios.get(`${this.config.serverUrl}/commands/internal/next`, {
                headers: { 'X-Agent-ID': this.config.agentId },
                validateStatus: (status) => status === 200 || status === 204
            });

            if (response.status === 204) {
                return null;
            }

            return response.data;
        } catch (error: any) {
            // Don't log connection refused errors too noisily, server might be down
            if (error.code === 'ECONNREFUSED') {
                this.logger.warn('Could not connect to server', { url: this.config.serverUrl });
            } else {
                this.logger.error('Failed to fetch command', { error: error.message });
            }
            return null;
        }
    }

    private async processCommand(command: Command): Promise<void> {
        this.logger.info('Received command', { id: command.id, type: command.type });

        // Simulate crash during execution possibility
        this.crashSimulator.maybeCrashDuringExecution();

        const result = await executeCommand(command.type, command.payload);

        // Simulate crash after execution but before reporting possibility
        this.crashSimulator.maybeCrashDuringExecution();

        await this.reporter.reportResult(command.id, result.result, result.success);
    }
}
