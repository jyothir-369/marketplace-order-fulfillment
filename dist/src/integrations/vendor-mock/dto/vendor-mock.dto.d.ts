export declare enum VendorResponseType {
    SUCCESS = "success",
    FAILURE = "failure",
    TIMEOUT = "timeout",
    DUPLICATE = "duplicate"
}
export declare class VendorFulfillmentRequestDto {
    orderId: string;
    lineItemId: string;
    productId: string;
    vendorId: string;
    quantity: number;
    correlationId: string;
}
export declare class VendorFulfillmentResponseDto {
    success: boolean;
    vendorReference?: string;
    message?: string;
    responseType: VendorResponseType;
}
export declare class VendorConfigDto {
    successRate?: number;
    timeoutMs?: number;
    forcedResponse?: VendorResponseType;
}
