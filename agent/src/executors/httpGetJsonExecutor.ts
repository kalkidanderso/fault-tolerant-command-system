/**
 * HTTP_GET_JSON command executor
 */

import axios, { AxiosError } from 'axios';
import { ExecutionResult, HttpGetJsonPayload, HttpGetJsonResult } from '../types';

/**
 * Limit for response body size (10 KB)
 */
const MAX_BODY_SIZE = 10 * 1024;

/**
 * Execute HTTP_GET_JSON command
 */
export async function executeHttpGetJson(payload: HttpGetJsonPayload): Promise<ExecutionResult> {
    // Validate payload
    if (!payload.url) {
        return {
            success: false,
            result: {
                status: 0,
                body: null,
                truncated: false,
                bytesReturned: 0,
                error: 'Missing URL',
            },
        };
    }

    try {
        const response = await axios.get(payload.url, {
            timeout: 10000, // 10 seconds timeout
            validateStatus: () => true, // Accept all status codes
        });

        let body = response.data;
        let truncated = false;
        let bytesReturned = 0;

        // Calculate size and truncate if necessary
        if (body) {
            const stringified = JSON.stringify(body);
            bytesReturned = stringified.length;

            if (bytesReturned > MAX_BODY_SIZE) {
                body = stringified.substring(0, MAX_BODY_SIZE);
                truncated = true;
            }
        }

        const result: HttpGetJsonResult = {
            status: response.status,
            body,
            truncated,
            bytesReturned,
            error: null,
        };

        return {
            success: true,
            result,
        };
    } catch (error) {
        const axiosError = error as AxiosError;
        return {
            success: false,
            result: {
                status: 0,
                body: null,
                truncated: false,
                bytesReturned: 0,
                error: axiosError.message,
            },
        };
    }
}
