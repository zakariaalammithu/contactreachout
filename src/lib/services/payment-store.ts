import { AuthStore } from '@/lib/auth/auth-store';

export interface PaymentRecord {
  sessionId: string;
  userId: string;
  credits: number;
  amountCents: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  credited: boolean;
  createdAt: string;
}

const payments = new Map<string, PaymentRecord>();

export class PaymentStore {
  static create(record: Omit<PaymentRecord, 'status' | 'credited' | 'createdAt'>) {
    const stored: PaymentRecord = { ...record, status: 'pending', credited: false, createdAt: new Date().toISOString() };
    payments.set(record.sessionId, stored);
    return stored;
  }

  static get(sessionId: string) { return payments.get(sessionId) || null; }

  static markPaid(sessionId: string) {
    const payment = payments.get(sessionId);
    if (!payment) return null;
    payment.status = 'paid';
    if (!payment.credited) {
      AuthStore.addPaidCredits(payment.userId, payment.credits);
      payment.credited = true;
    }
    payments.set(sessionId, payment);
    return payment;
  }

  static markFailed(sessionId: string) {
    const payment = payments.get(sessionId);
    if (!payment || payment.status === 'paid') return payment || null;
    payment.status = 'failed';
    payments.set(sessionId, payment);
    return payment;
  }
}
