/**
 * Centralized error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

/**
 * Custom application error
 */
export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public isOperational = true
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

/**
 * Error response structure
 */
interface ErrorResponse {
    error: {
        message: string;
        details?: unknown;
    };
}

/**
 * Global error handler middleware
 */
export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    logger.error('Error occurred', {
        error: err.message,
        stack: err.stack,
    });

    // Zod validation errors
    if (err instanceof ZodError) {
        const response: ErrorResponse = {
            error: {
                message: 'Validation error',
                details: err.errors,
            },
        };
        res.status(400).json(response);
        return;
    }

    // Application errors
    if (err instanceof AppError) {
        const response: ErrorResponse = {
            error: {
                message: err.message,
            },
        };
        res.status(err.statusCode).json(response);
        return;
    }

    // Unknown errors
    const response: ErrorResponse = {
        error: {
            message: 'Internal server error',
        },
    };
    res.status(500).json(response);
}

/**
 * 404 handler
 */
export function notFoundHandler(_req: Request, res: Response): void {
    const response: ErrorResponse = {
        error: {
            message: 'Route not found',
        },
    };
    res.status(404).json(response);
}

/**
 * Async route handler wrapper to catch errors
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
