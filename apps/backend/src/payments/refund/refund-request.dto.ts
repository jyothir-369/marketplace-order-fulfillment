export class RefundRequestDto {
  orderReference: string;
  amountPaise?: number; // null = full; >0 = partial; must be validated against confirmed amount
  reason?: string;
}
