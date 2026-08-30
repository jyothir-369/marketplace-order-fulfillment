export declare class CreateProductDto {
    vendorId: string;
    name: string;
    price: number;
    stockCount: number;
}
export declare class UpdateProductDto {
    name?: string;
    price?: number;
    stockCount?: number;
    isActive?: boolean;
}
export declare class ProductResponseDto {
    id: string;
    vendorId: string;
    vendorName: string;
    name: string;
    price: number;
    stockCount: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
