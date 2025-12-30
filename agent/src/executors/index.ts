/**
 * Executor factory
 */

import { CommandType, ExecutionResult, CommandPayload } from '../types';
import { executeDelay } from './delayExecutor';
import { executeHttpGetJson } from './httpGetJsonExecutor';

/**
 * Execute a command based on its type
 */
export async function executeCommand(
    type: CommandType,
    payload: CommandPayload
): Promise<ExecutionResult> {
    switch (type) {
        case CommandType.DELAY:
            // Type assertion needed because TS doesn't narrow based on the enum switch automatically for the payload union here in the way we want without a discriminated union on the payload itself usually,
            // but here we just cast it for simplicity as we validated it on server side.
            return executeDelay(payload as any);
        case CommandType.HTTP_GET_JSON:
            return executeHttpGetJson(payload as any);
        default:
            return {
                success: false,
                result: {
                    error: `Unknown command type: ${type}`,
                } as any,
            };
    }
}
