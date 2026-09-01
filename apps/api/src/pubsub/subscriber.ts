/**
 * Pub/Sub Subscriber / Task Worker
 *
 * Pulls task events from the docsetuai-task-events topic and executes
 * the orchestrator in the background. This decouples task dispatch from
 * the HTTP request-response cycle, enabling:
 *   - Tasks that outlive a single HTTP request
 *   - Retry on transient failures (Pub/Sub ack/nack)
 *   - Horizontal scaling across multiple Cloud Run instances
 *
 * In demo mode, this module is NOT started — tasks run in-process.
 */

import { PubSub, type Message } from '@google-cloud/pubsub';
import { config } from '@docsetuai/config';
import { taskStore } from '../store/taskStore';
import { runTask } from '../agents/orchestrator.agent';
import type { TaskEvent } from './publisher';

const SUBSCRIPTION_NAME = 'docsetuai-task-worker';
const ACK_DEADLINE_SECONDS = 600; // max task runtime before nack

let isRunning = false;

export function startSubscriber(): void {
  if (config.runtime_mode !== 'cloud') {
    console.log('[PubSub Subscriber] Demo mode — subscriber not started');
    return;
  }

  if (isRunning) {
    console.warn('[PubSub Subscriber] Already running');
    return;
  }

  const pubsub = new PubSub({ projectId: config.google_cloud_project });
  const subscription = pubsub.subscription(SUBSCRIPTION_NAME, {
    flowControl: {
      maxMessages: 2, // process max 2 tasks concurrently per instance
    },
  });

  subscription.on('message', handleMessage);
  subscription.on('error', (err) => {
    console.error('[PubSub Subscriber] Subscription error:', err);
    // Let Cloud Run restart the instance on fatal errors
  });

  isRunning = true;
  console.log(`[PubSub Subscriber] ✅ Listening on ${SUBSCRIPTION_NAME}`);
}

async function handleMessage(message: Message): Promise<void> {
  let event: TaskEvent;

  try {
    event = JSON.parse(message.data.toString()) as TaskEvent;
  } catch (err) {
    console.error('[PubSub Subscriber] Failed to parse message:', err);
    message.ack(); // discard malformed messages
    return;
  }

  console.log(`[PubSub Subscriber] Received ${event.type} for task ${event.task_id}`);

  try {
    switch (event.type) {
      case 'task.run': {
        const task = taskStore.getTask(event.task_id);
        if (!task) {
          console.warn(`[PubSub Subscriber] Task ${event.task_id} not found — acking`);
          message.ack();
          return;
        }
        if (task.status !== 'pending') {
          console.warn(`[PubSub Subscriber] Task ${event.task_id} is not pending (${task.status}) — acking`);
          message.ack();
          return;
        }

        // Extend the ack deadline so Pub/Sub doesn't redeliver while we're running
        message.modAck(ACK_DEADLINE_SECONDS);

        await runTask(task);
        message.ack();
        console.log(`[PubSub Subscriber] Task ${event.task_id} completed — acked`);
        break;
      }

      case 'task.cancel': {
        const { cancelTask } = await import('../agents/orchestrator.agent');
        cancelTask(event.task_id);
        message.ack();
        break;
      }

      default:
        console.log(`[PubSub Subscriber] Unhandled event type: ${event.type}`);
        message.ack();
    }
  } catch (err) {
    console.error(`[PubSub Subscriber] Error processing ${event.type} for ${event.task_id}:`, err);
    // nack: Pub/Sub will redeliver after the ack deadline
    message.nack();
  }
}

export function stopSubscriber(): void {
  isRunning = false;
}
