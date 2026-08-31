import { Firestore } from '@google-cloud/firestore';
import { config } from '@docsetuai/config';
import type {
  Customer,
  Invoice,
  Task,
  Approval,
  Activity,
  CustomerMemory,
} from '@docsetuai/types';

class FirestoreRepository {
  private db: Firestore | null = null;
  private isConnected = false;

  constructor() {
    if (config.google_cloud_project && config.runtime_mode === 'cloud') {
      try {
        this.db = new Firestore({
          projectId: config.google_cloud_project,
          databaseId: config.firestore_database || '(default)',
        });
        this.isConnected = true;
        console.log(
          `[Firestore] Connected to GCP Project "${config.google_cloud_project}", DB "${config.firestore_database}"`,
        );
      } catch (err) {
        console.warn('[Firestore] Initialization error (falling back to in-memory):', err);
        this.db = null;
        this.isConnected = false;
      }
    }
  }

  isAvailable(): boolean {
    return this.isConnected && this.db !== null;
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────

  async saveTask(task: Task): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.collection('tasks').doc(task.id).set(task, { merge: true });
    } catch (err) {
      console.warn(`[Firestore] Failed to save task ${task.id}:`, err);
    }
  }

  async getTask(id: string): Promise<Task | null> {
    if (!this.db) return null;
    try {
      const doc = await this.db.collection('tasks').doc(id).get();
      return doc.exists ? (doc.data() as Task) : null;
    } catch (err) {
      console.warn(`[Firestore] Failed to get task ${id}:`, err);
      return null;
    }
  }

  // ── Approvals ─────────────────────────────────────────────────────────────

  async saveApproval(approval: Approval): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.collection('approvals').doc(approval.id).set(approval, { merge: true });
    } catch (err) {
      console.warn(`[Firestore] Failed to save approval ${approval.id}:`, err);
    }
  }

  // ── Activities / Audit Trail ──────────────────────────────────────────────

  async logActivity(activity: Activity): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.collection('activities').doc(activity.id).set(activity);
    } catch (err) {
      console.warn(`[Firestore] Failed to log activity ${activity.id}:`, err);
    }
  }

  // ── Customer Memory ───────────────────────────────────────────────────────

  async saveCustomerMemory(memory: CustomerMemory): Promise<void> {
    if (!this.db) return;
    try {
      await this.db
        .collection('customer_memory')
        .doc(memory.customer_id)
        .set(memory, { merge: true });
    } catch (err) {
      console.warn(`[Firestore] Failed to save memory for ${memory.customer_id}:`, err);
    }
  }

  async getCustomerMemory(customerId: string): Promise<CustomerMemory | null> {
    if (!this.db) return null;
    try {
      const doc = await this.db.collection('customer_memory').doc(customerId).get();
      return doc.exists ? (doc.data() as CustomerMemory) : null;
    } catch (err) {
      console.warn(`[Firestore] Failed to get memory for ${customerId}:`, err);
      return null;
    }
  }

  // ── Seed Customers & Invoices ─────────────────────────────────────────────

  async seedData(customers: Customer[], invoices: Invoice[]): Promise<void> {
    if (!this.db) return;
    try {
      const batch = this.db.batch();
      customers.slice(0, 20).forEach((c) => {
        const ref = this.db!.collection('customers').doc(c.id);
        batch.set(ref, c, { merge: true });
      });
      invoices.slice(0, 25).forEach((inv) => {
        const ref = this.db!.collection('invoices').doc(inv.id);
        batch.set(ref, inv, { merge: true });
      });
      await batch.commit();
      console.log(`[Firestore] Seeded sample customers and invoices to Cloud Firestore`);
    } catch (err) {
      console.warn('[Firestore] Batch seed notice:', err);
    }
  }
}

export const firestoreRepo = new FirestoreRepository();
