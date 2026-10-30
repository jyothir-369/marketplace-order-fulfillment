import { Controller } from '@nestjs/common';

/**
 * Administrative payment API boundary.
 *
 * Administrative payment operations must use the application's established
 * admin authorization and audit trail. No financial operation is exposed
 * until those protections are wired.
 */
@Controller('payments/admin')
export class AdminPaymentsController {}
