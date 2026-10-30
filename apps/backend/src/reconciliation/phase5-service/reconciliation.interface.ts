export interface ReconciliationService {
  compareProviderRecords(orderIds: string[]): Promise<{ matched: number; mismatched: { orderId: string; internalPaise: number; providerPaise: number }[]; missingTransfers: string[]; missingPayments: string[] } >;
  detectStaleTransfers(timeoutMinutes: number): Promise<string[]>;
  generateDiscrepancyReport(): Promise<{ timestamp: string; discrepancies: any[]; recommendations: string[] }>; // recommendations are safe only — no automated repair without separate approval
  reconcileAmbiguousTransfer(providerRef: string): Promise<'RETRY' | 'RECONCILE' | 'MANUAL_REVIEW'>;
}
