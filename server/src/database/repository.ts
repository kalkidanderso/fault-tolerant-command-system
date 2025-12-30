/**
 * Data access layer for command persistence
 */

import Database from 'better-sqlite3';
import { Command, CommandPayload, CommandResult, CommandStatus, CommandType } from '../types';
import { logger } from '../utils/logger';

/**
 * Database row structure (snake_case from SQLite)
 */
interface CommandRow {
    id: string;
    type: string;
    payload: string;
    status: string;
    result: string | null;
    agent_id: string | null;
    created_at: number;
    updated_at: number;
    started_at: number | null;
    completed_at: number | null;
}

/**
 * Repository for command data access
 */
export class CommandRepository {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    /**
     * Convert database row to Command entity
     */
    private rowToCommand(row: CommandRow): Command {
        return {
            id: row.id,
            type: row.type as CommandType,
            payload: JSON.parse(row.payload) as CommandPayload,
            status: row.status as CommandStatus,
            result: row.result ? (JSON.parse(row.result) as CommandResult) : null,
            agentId: row.agent_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            startedAt: row.started_at,
            completedAt: row.completed_at,
        };
    }

    /**
     * Create a new command
     */
    createCommand(id: string, type: CommandType, payload: CommandPayload): Command {
        const now = Date.now();
        const stmt = this.db.prepare(`
      INSERT INTO commands (id, type, payload, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

        stmt.run(id, type, JSON.stringify(payload), CommandStatus.PENDING, now, now);

        logger.info('Command created', { commandId: id, type });

        return {
            id,
            type,
            payload,
            status: CommandStatus.PENDING,
            result: null,
            agentId: null,
            createdAt: now,
            updatedAt: now,
            startedAt: null,
            completedAt: null,
        };
    }

    /**
     * Get command by ID
     */
    getCommand(id: string): Command | null {
        const stmt = this.db.prepare('SELECT * FROM commands WHERE id = ?');
        const row = stmt.get(id) as CommandRow | undefined;

        if (!row) {
            return null;
        }

        return this.rowToCommand(row);
    }

    /**
     * Get next pending command and mark as RUNNING atomically
     * This ensures idempotency - only one agent can claim a command
     */
    claimNextPendingCommand(agentId: string): Command | null {
        const now = Date.now();

        // Use transaction for atomicity
        const transaction = this.db.transaction(() => {
            // Find oldest pending command
            const findStmt = this.db.prepare(`
        SELECT * FROM commands 
        WHERE status = ? 
        ORDER BY created_at ASC 
        LIMIT 1
      `);
            const row = findStmt.get(CommandStatus.PENDING) as CommandRow | undefined;

            if (!row) {
                return null;
            }

            // Update to RUNNING
            const updateStmt = this.db.prepare(`
        UPDATE commands 
        SET status = ?, agent_id = ?, updated_at = ?, started_at = ?
        WHERE id = ? AND status = ?
      `);

            const result = updateStmt.run(
                CommandStatus.RUNNING,
                agentId,
                now,
                now,
                row.id,
                CommandStatus.PENDING
            );

            // Check if update succeeded (row was still PENDING)
            if (result.changes === 0) {
                return null;
            }

            logger.info('Command claimed by agent', { commandId: row.id, agentId });

            return this.rowToCommand({ ...row, status: CommandStatus.RUNNING, agent_id: agentId });
        });

        return transaction();
    }

    /**
     * Update command status and result
     */
    updateCommand(
        id: string,
        status: CommandStatus,
        result?: CommandResult,
        agentId?: string
    ): boolean {
        const now = Date.now();
        const isTerminal = status === CommandStatus.COMPLETED || status === CommandStatus.FAILED;

        const stmt = this.db.prepare(`
      UPDATE commands 
      SET status = ?, 
          result = ?, 
          agent_id = COALESCE(?, agent_id),
          updated_at = ?,
          completed_at = ?
      WHERE id = ?
    `);

        const dbResult = stmt.run(
            status,
            result ? JSON.stringify(result) : null,
            agentId || null,
            now,
            isTerminal ? now : null,
            id
        );

        if (dbResult.changes > 0) {
            logger.info('Command updated', { commandId: id, status });
            return true;
        }

        return false;
    }

    /**
     * Recover stale RUNNING commands on server restart
     * Returns them to PENDING status for retry
     */
    recoverStaleCommands(): number {
        const stmt = this.db.prepare(`
      UPDATE commands 
      SET status = ?, 
          agent_id = NULL, 
          updated_at = ?,
          started_at = NULL
      WHERE status = ?
    `);

        const result = stmt.run(CommandStatus.PENDING, Date.now(), CommandStatus.RUNNING);

        if (result.changes > 0) {
            logger.warn('Recovered stale RUNNING commands', { count: result.changes });
        }

        return result.changes;
    }

    /**
     * Get all commands (for debugging/monitoring)
     */
    getAllCommands(): Command[] {
        const stmt = this.db.prepare('SELECT * FROM commands ORDER BY created_at DESC');
        const rows = stmt.all() as CommandRow[];
        return rows.map((row) => this.rowToCommand(row));
    }

    /**
     * Get commands by status
     */
    getCommandsByStatus(status: CommandStatus): Command[] {
        const stmt = this.db.prepare('SELECT * FROM commands WHERE status = ? ORDER BY created_at ASC');
        const rows = stmt.all(status) as CommandRow[];
        return rows.map((row) => this.rowToCommand(row));
    }
}
