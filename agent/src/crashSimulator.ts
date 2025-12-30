/**
 * Crash simulation logic
 */

import { Logger } from './utils/logger';

export class CrashSimulator {
    private killAfter: number | undefined;
    private randomFailures: boolean;
    private logger: Logger;
    private cycles: number = 0;

    constructor(logger: Logger, killAfter?: number, randomFailures: boolean = false) {
        this.logger = logger;
        this.killAfter = killAfter;
        this.randomFailures = randomFailures;

        if (this.killAfter !== undefined) {
            this.logger.warn(`Crash simulator active: will kill after ${this.killAfter} cycles`);
        }

        if (this.randomFailures) {
            this.logger.warn('Random failure simulator active');
        }
    }

    /**
     * Called before polling cycle
     */
    check(): void {
        this.cycles++;

        // Deterministic crash
        if (this.killAfter !== undefined && this.cycles >= this.killAfter) {
            this.logger.error(`CRASH SIMULATION: Killing process after ${this.cycles} cycles`);
            process.exit(1);
        }

        // Random crash (10% chance per cycle if enabled)
        if (this.randomFailures && Math.random() < 0.1) {
            this.logger.error('CRASH SIMULATION: Random process kill');
            process.exit(1);
        }
    }

    /**
     * Simulate crash during execution
     */
    maybeCrashDuringExecution(): void {
        if (this.randomFailures && Math.random() < 0.2) {
            this.logger.error('CRASH SIMULATION: Crashed during execution');
            process.exit(1);
        }
    }
}
