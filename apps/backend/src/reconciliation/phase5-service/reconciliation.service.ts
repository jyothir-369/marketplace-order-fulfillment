import { Injectable } from '@nestjs/common';
export type ReconciliationStatus = 'COMPLETED' | 'FAILED' | 'PENDING';
@Injectable()
export class ReconciliationService {
  async reconcile(options?: { providerCompareEnabled?: boolean; timeoutMinutes?: number }): Promise<{ runId: string; status: ReconciliationStatus; findings: any[]; providerDataAvailable: boolean }> {
    const runId = `RC-${Date.now()}`;
    return { runId, status: 'COMPLETED', findings: [], providerDataAvailable: false };
  }
  async detectStaleTransfers(timeoutMinutes: number): Promise<string[]> { return []; }
  async generateDiscrepancyReport(): Promise<{ timestamp: string; discrepancies: any[]; recommendations: string[] }> { return { timestamp: new Date().toISOString(), discrepancies: [], recommendations: ['policy-decisions-pending'] }; }
  async reconcileAmbiguousTransfer(providerRef: string): Promise<'RETRY' | 'RECONCILE' | 'MANUAL_REVIEW'> { return 'MANUAL_REVIEW'; }
}
