import { Controller } from '@nestjs/common';

/**
 * Vendor payment API boundary.
 *
 * Financial endpoints must be added only with the application's established
 * authentication, vendor-membership and ownership guards. This controller
 * intentionally exposes no financial data until those protections are wired.
 */
@Controller('payments/vendor')
export class VendorPaymentsController {}
