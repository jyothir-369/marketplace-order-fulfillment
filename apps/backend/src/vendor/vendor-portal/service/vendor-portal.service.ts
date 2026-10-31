import { Injectable } from '@nestjs/common';
@Injectable()
export class VendorPortalService {
  // Policy-independent read-only view; no financial calculation; uses existing entities/module contracts only
  getStatus(query: { vendorId: string; orderReference?: string }) {
    // BLOCKED criteria: requires DB + §9 approved; returns structured placeholder showing what would be visible when prerequisites met
    return {
      vendorId: query.vendorId,
      viewStatus: 'STRUCTURE_ONLY',
      grossSalesAvailable: false,
      adjustmentsAvailable: false,
      commissionAvailable: false,
      payableAvailable: false,
      transferAvailable: false,
      settlementAvailable: false,
      blockedReason: 'DB authorization (B) + §9 rules (A) unresolved; no live data queried',
      prerequisitesMissing: ['A', 'B', 'C', 'D'],
      auditRef: 'vendor-portal.service (independent; no DB writes; no provider calls; no finance calc)',
    };
  }
  getTransferStatus(query: { vendorId: string }) {
    return {
      vendorId: query.vendorId,
      capturedProcessedSettledDistinguished: 'BLOCKED — requires DB + provider verification',
      pendingFailedTransfers: 'BLOCKED — same prerequisites',
      prerequisites: ['B', 'C', 'D'],
      noUnrestrictedBypass: true,
    };
  }
}
