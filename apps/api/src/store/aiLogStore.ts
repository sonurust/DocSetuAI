/**
 * AI Telemetry & Dev Logs Store
 *
 * Stores prompt, system instruction, token/character payloads, response outputs,
 * latency, and error states for all Gemini 3.6 Flash invocations and tool operations.
 * Emits real-time 'ai_log' events for the Developer Console.
 */

import { EventEmitter } from 'events';
import type { AiLogEntry } from '@docsetuai/types';
import { firestoreRepo } from './firestore.repository';
import { v4 as uuid } from 'uuid';

class AiLogStore extends EventEmitter {
  private readonly logs: AiLogEntry[] = [];
  private readonly maxLogs: number = 300;

  /**
   * Record a new AI invocation log
   */
  log(entry: Omit<AiLogEntry, 'id' | 'timestamp'>): AiLogEntry {
    const fullEntry: AiLogEntry = {
      ...entry,
      id: uuid(),
      timestamp: new Date().toISOString(),
    };

    this.logs.unshift(fullEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Persist to Google Cloud Firestore
    firestoreRepo.saveAiLog(fullEntry).catch(() => {});

    // Broadcast to live stream subscribers
    this.emit('ai_log', fullEntry);
    return fullEntry;
  }

  /**
   * Retrieve all or filtered AI logs
   */
  getLogs(taskId?: string, limit: number = 100): AiLogEntry[] {
    let result = this.logs;
    if (taskId) {
      result = result.filter((l) => l.task_id === taskId);
    }
    return result.slice(0, limit);
  }

  /**
   * Clear recorded logs
   */
  clear(): void {
    this.logs.length = 0;
    this.emit('cleared');
  }
}

export const aiLogStore = new AiLogStore();
