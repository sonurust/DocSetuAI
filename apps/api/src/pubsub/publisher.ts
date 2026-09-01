/**
 * Pub/Sub Publisher
 *
 * Publishes task lifecycle events to the docsetuai-task-events topic.
 * In demo/local mode this is a no-op so the rest of the system is unaffected.
 *
 * Events published:
 *   - task.run   → triggers background orchestration
 *   - task.cancel → signals the worker to abort
 */

import { PubSub } from '@google-cloud/pubsub';
import { config } from '@docsetuai/config';

export type TaskEventType = 'task.run' | 'task.cancel' | 'task.completed' | 'task.failed';

export interface TaskEvent {
  type: TaskEventType;
  task_id: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

let _pubSubClient: PubSub | null = null;

function getClient(): PubSub | null {
  if (config.runtime_mode !== 'cloud') return null;
  if (!_pubSubClient) {
    _pubSubClient = new PubSub({ projectId: config.google_cloud_project });
  }
  return _pubSubClient;
}

/**
 * Publish a task event to Pub/Sub.
 * Silently no-ops in demo mode or if Pub/Sub is unavailable.
 */
export async function publishTaskEvent(event: TaskEvent): Promise<void> {
  const client = getClient();
  if (!client) {
    console.log(`[PubSub] Demo mode — skipping publish: ${event.type} for ${event.task_id}`);
    return;
  }

  try {
    const topic = client.topic(config.pubsub_topic);
    const data = Buffer.from(JSON.stringify(event));

    const messageId = await topic.publishMessage({
      data,
      attributes: {
        type: event.type,
        task_id: event.task_id,
        timestamp: event.timestamp,
      },
    });

    console.log(`[PubSub] Published ${event.type} for task ${event.task_id} → messageId=${messageId}`);
  } catch (err) {
    // Non-fatal: the orchestrator continues even if Pub/Sub is unavailable.
    // The task still runs in-process; Pub/Sub is the async/decoupled path.
    console.warn(`[PubSub] Failed to publish ${event.type} for ${event.task_id}:`, err);
  }
}
