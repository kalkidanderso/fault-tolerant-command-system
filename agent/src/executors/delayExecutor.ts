/**
 * DELAY command executor
 */

import { DelayPayload, DelayResult, ExecutionResult } from '../types';

/**
 * Execute DELAY command
 */
export async function executeDelay(payload: DelayPayload): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Validate payload
    if (!payload.ms || payload.ms <= 0) {
        return {
            success: false,
            result: {
                ok: false,
                tookMs: 0,
            },
        };
    }

    // Execute delay
    await new Promise((resolve) => setTimeout(resolve, payload.ms));

    const endTime = Date.now();
    const tookMs = endTime - startTime;

    const result: DelayResult = {
        ok: true,
        tookMs,
    };

    return {
        success: true,
        result,
    };
}
