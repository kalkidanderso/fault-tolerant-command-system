/**
 * Result reporter
 */

import axios from 'axios';
import { AgentConfig, CommandResult } from './types';
import { Logger } from './utils/logger'; // Import just for type usage if needed, but passing instance

export class Reporter {
    private config: AgentConfig;
    private logger: Logger;

    constructor(config: AgentConfig, logger: Logger) {
        this.config = config;
        this.logger = logger;
    }

    async reportResult(commandId: string, result: CommandResult, success: boolean): Promise<boolean> {
        const url = `${this.config.serverUrl}/commands/internal/${commandId}/complete`;
        let attempts = 0;

        while (attempts < this.config.maxRetryAttempts) {
            try {
                await axios.post(url, {
                    agentId: this.config.agentId,
                    result,
                    success,
                });

                this.logger.info('Result reported successfully', { commandId });
                return true;
            } catch (error: any) {
                attempts++;
                this.logger.warn(`Failed to report result (attempt ${attempts}/${this.config.maxRetryAttempts})`, {
                    commandId,
                    error: error.message,
                });

                if (attempts < this.config.maxRetryAttempts) {
                    // Exponential backoff
                    const delay = Math.pow(2, attempts) * 1000;
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }

        this.logger.error('Failed to report result after max attempts', { commandId });
        return false;
    }
}
