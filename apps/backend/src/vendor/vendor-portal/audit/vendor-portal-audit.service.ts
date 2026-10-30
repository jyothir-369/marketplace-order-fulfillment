import { Injectable } from '@nestjs/common';
@Injectable()
export class VendorPortalAuditService {
  // Uses AuditModule / AuditLog entity already registered in app.module; no new entities created
  // No unrestricted mark-paid action allowed; actions: PORTAL_VIEW, STATUS_CHECK (read-only)
  logAction(action: string, vendorId: string, meta?: any): { action: string; vendorId: string; meta?: any } {
    return { action, vendorId, meta };
  }
}
