/**
 * Type definitions for the Command Execution System
 */

/**
 * Command status lifecycle
 */
export enum CommandStatus {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

/**
 * Supported command types
 */
export enum CommandType {
    DELAY = 'DELAY',
    HTTP_GET_JSON = 'HTTP_GET_JSON',
}

/**
 * Payload for DELAY command
 */
export interface DelayPayload {
    ms: number;
}

/**
 * Payload for HTTP_GET_JSON command
 */
export interface HttpGetJsonPayload {
    url: string;
}

/**
 * Union type for all command payloads
 */
export type CommandPayload = DelayPayload | HttpGetJsonPayload;

/**
 * Result from DELAY command execution
 */
export interface DelayResult {
    ok: boolean;
    tookMs: number;
}

/**
 * Result from HTTP_GET_JSON command execution
 */
export interface HttpGetJsonResult {
    status: number;
    body: unknown;
    truncated: boolean;
    bytesReturned: number;
    error: string | null;
}

/**
 * Union type for all command results
 */
export type CommandResult = DelayResult | HttpGetJsonResult;

/**
 * Command entity stored in database
 */
export interface Command {
    id: string;
    type: CommandType;
    payload: CommandPayload;
    status: CommandStatus;
    result: CommandResult | null;
    agentId: string | null;
    createdAt: number;
    updatedAt: number;
    startedAt: number | null;
    completedAt: number | null;
}

/**
 * Request body for creating a command
 */
export interface CreateCommandRequest {
    type: CommandType;
    payload: CommandPayload;
}

/**
 * Response for command creation
 */
export interface CreateCommandResponse {
    commandId: string;
}

/**
 * Response for command status query
 */
export interface CommandStatusResponse {
    status: CommandStatus;
    result: CommandResult | null;
    agentId: string | null;
}

/**
 * Request body for completing a command (internal agent API)
 */
export interface CompleteCommandRequest {
    agentId: string;
    result: CommandResult;
    success: boolean;
}
