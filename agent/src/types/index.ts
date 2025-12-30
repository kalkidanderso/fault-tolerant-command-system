/**
 * Type definitions for Agent
 */

/**
 * Command status
 */
export enum CommandStatus {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

/**
 * Command types
 */
export enum CommandType {
    DELAY = 'DELAY',
    HTTP_GET_JSON = 'HTTP_GET_JSON',
}

/**
 * DELAY command payload
 */
export interface DelayPayload {
    ms: number;
}

/**
 * HTTP_GET_JSON command payload
 */
export interface HttpGetJsonPayload {
    url: string;
}

/**
 * Command payload union
 */
export type CommandPayload = DelayPayload | HttpGetJsonPayload;

/**
 * DELAY command result
 */
export interface DelayResult {
    ok: boolean;
    tookMs: number;
}

/**
 * HTTP_GET_JSON command result
 */
export interface HttpGetJsonResult {
    status: number;
    body: unknown;
    truncated: boolean;
    bytesReturned: number;
    error: string | null;
}

/**
 * Command result union
 */
export type CommandResult = DelayResult | HttpGetJsonResult;

/**
 * Command from server
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
 * Execution result
 */
export interface ExecutionResult {
    success: boolean;
    result: CommandResult;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
    agentId: string;
    serverUrl: string;
    pollIntervalMs: number;
    maxRetryAttempts: number;
    httpTimeoutMs: number;
    killAfter?: number;
    randomFailures: boolean;
}
