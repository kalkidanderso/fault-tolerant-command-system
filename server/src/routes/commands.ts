/**
 * REST API routes for command management
 */

import { Router, Request, Response } from 'express';
import { CommandService } from '../services/commandService';
import {
    CommandStatusResponse,
    CompleteCommandRequest,
    CreateCommandRequest,
    CreateCommandResponse,
} from '../types';
import { AppError, asyncHandler } from '../middleware/errorHandler';


/**
 * Create command routes
 */
export function createCommandRoutes(commandService: CommandService): Router {
    const router = Router();

    /**
     * POST /commands
     * Create a new command
     */
    router.post(
        '/',
        asyncHandler(async (req: Request, res: Response) => {
            const request = req.body as CreateCommandRequest;

            const command = commandService.createCommand(request);

            const response: CreateCommandResponse = {
                commandId: command.id,
            };

            res.status(201).json(response);
        })
    );

    /**
     * GET /commands/:id
     * Get command status and result
     */
    router.get(
        '/:id',
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = req.params;

            const command = commandService.getCommand(id);

            if (!command) {
                throw new AppError(404, 'Command not found');
            }

            const response: CommandStatusResponse = {
                status: command.status,
                result: command.result,
                agentId: command.agentId,
            };

            res.json(response);
        })
    );

    /**
     * GET /internal/commands/next
     * Agent endpoint to get next pending command
     */
    router.get(
        '/internal/next',
        asyncHandler(async (req: Request, res: Response) => {
            const agentId = req.headers['x-agent-id'] as string;

            if (!agentId) {
                throw new AppError(400, 'Missing X-Agent-ID header');
            }

            const command = commandService.getNextCommand(agentId);

            if (!command) {
                res.status(204).send(); // No content - no work available
                return;
            }

            res.json(command);
        })
    );

    /**
     * POST /internal/commands/:id/complete
     * Agent endpoint to report command completion
     */
    router.post(
        '/internal/:id/complete',
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = req.params;
            const { agentId, result, success } = req.body as CompleteCommandRequest;

            if (!agentId || !result) {
                throw new AppError(400, 'Missing required fields: agentId, result');
            }

            let updated: boolean;

            if (success) {
                updated = commandService.completeCommand(id, agentId, result);
            } else {
                updated = commandService.failCommand(id, agentId, result);
            }

            if (!updated) {
                throw new AppError(400, 'Failed to update command');
            }

            res.json({ success: true });
        })
    );

    /**
     * GET /internal/commands
     * Get all commands (for debugging/monitoring)
     */
    router.get(
        '/internal/all',
        asyncHandler(async (_req: Request, res: Response) => {
            const commands = commandService.getAllCommands();
            res.json(commands);
        })
    );

    /**
     * GET /health
     * Health check endpoint
     */
    router.get('/health', (_req: Request, res: Response) => {
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    return router;
}
