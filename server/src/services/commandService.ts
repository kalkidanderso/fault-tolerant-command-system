/**
 * Business logic for command management
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { CommandRepository } from '../database/repository';
import {
    Command,
    CommandPayload,
    CommandResult,
    CommandStatus,
    CommandType,
    CreateCommandRequest,
} from '../types';
import { logger } from '../utils/logger';

/**
 * Validation schemas using Zod
 */
const DelayPayloadSchema = z.object({
    ms: z.number().int().positive().max(300000), // Max 5 minutes
});

const HttpGetJsonPayloadSchema = z.object({
    url: z.string().url(),
});

const CreateCommandSchema = z.object({
    type: z.nativeEnum(CommandType),
    payload: z.union([DelayPayloadSchema, HttpGetJsonPayloadSchema]),
});

/**
 * Service for command business logic
 */
export class CommandService {
    private repository: CommandRepository;

    constructor(repository: CommandRepository) {
        this.repository = repository;
    }

    /**
     * Validate command payload based on type
     */
    private validatePayload(type: CommandType, payload: unknown): CommandPayload {
        if (type === CommandType.DELAY) {
            return DelayPayloadSchema.parse(payload);
        } else if (type === CommandType.HTTP_GET_JSON) {
            return HttpGetJsonPayloadSchema.parse(payload);
        }

        throw new Error(`Unknown command type: ${type}`);
    }

    /**
     * Create a new command
     */
    createCommand(request: CreateCommandRequest): Command {
        // Validate request
        const validated = CreateCommandSchema.parse(request);

        // Validate payload
        const payload = this.validatePayload(validated.type, validated.payload);

        // Generate unique ID
        const commandId = uuidv4();

        // Create command
        const command = this.repository.createCommand(commandId, validated.type, payload);

        logger.info('Command created successfully', {
            commandId: command.id,
            type: command.type,
        });

        return command;
    }

    /**
     * Get command by ID
     */
    getCommand(id: string): Command | null {
        return this.repository.getCommand(id);
    }

    /**
     * Get next pending command for agent execution
     */
    getNextCommand(agentId: string): Command | null {
        const command = this.repository.claimNextPendingCommand(agentId);

        if (command) {
            logger.info('Command assigned to agent', {
                commandId: command.id,
                agentId,
            });
        }

        return command;
    }

    /**
     * Complete a command with result
     */
    completeCommand(commandId: string, agentId: string, result: CommandResult): boolean {
        const command = this.repository.getCommand(commandId);

        if (!command) {
            logger.error('Command not found for completion', { commandId });
            return false;
        }

        // Verify agent ID matches
        if (command.agentId !== agentId) {
            logger.error('Agent ID mismatch for command completion', {
                commandId,
                expectedAgentId: command.agentId,
                actualAgentId: agentId,
            });
            return false;
        }

        // Verify command is in RUNNING state
        if (command.status !== CommandStatus.RUNNING) {
            logger.error('Command not in RUNNING state', {
                commandId,
                currentStatus: command.status,
            });
            return false;
        }

        // Update to COMPLETED
        const success = this.repository.updateCommand(commandId, CommandStatus.COMPLETED, result);

        if (success) {
            logger.info('Command completed successfully', { commandId, agentId });
        }

        return success;
    }

    /**
     * Fail a command with error result
     */
    failCommand(commandId: string, agentId: string, result: CommandResult): boolean {
        const command = this.repository.getCommand(commandId);

        if (!command) {
            logger.error('Command not found for failure', { commandId });
            return false;
        }

        // Verify agent ID matches
        if (command.agentId !== agentId) {
            logger.error('Agent ID mismatch for command failure', {
                commandId,
                expectedAgentId: command.agentId,
                actualAgentId: agentId,
            });
            return false;
        }

        // Update to FAILED
        const success = this.repository.updateCommand(commandId, CommandStatus.FAILED, result);

        if (success) {
            logger.warn('Command failed', { commandId, agentId });
        }

        return success;
    }

    /**
     * Recover stale commands on server startup
     */
    recoverStaleCommands(): void {
        logger.info('Starting stale command recovery');
        const count = this.repository.recoverStaleCommands();
        logger.info('Stale command recovery completed', { recoveredCount: count });
    }

    /**
     * Get all commands (for monitoring)
     */
    getAllCommands(): Command[] {
        return this.repository.getAllCommands();
    }

    /**
     * Get commands by status
     */
    getCommandsByStatus(status: CommandStatus): Command[] {
        return this.repository.getCommandsByStatus(status);
    }
}
