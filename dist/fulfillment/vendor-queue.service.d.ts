import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
export interface VendorQueueJobData {
    jobId: string;
    orderLineItemId: string;
    vendorId: string;
    correlationId: string;
}
export interface VendorConcurrencyConfig {
    vendorId: string;
    concurrency: number;
    prefix?: string;
}
export declare class VendorQueueService implements OnModuleInit, OnModuleDestroy {
    private readonly baseQueue;
    private readonly logger;
    private readonly vendorQueues;
    private readonly vendorQueueEvents;
    private readonly defaultConcurrency;
    private readonly maxConcurrencyPerVendor;
    constructor(baseQueue: Queue);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    getQueueName(vendorId: string): string;
    private getQueueEventsName;
    getOrCreateVendorQueue(vendorId: string, concurrency?: number): Promise<Queue<VendorQueueJobData>>;
    addJobToVendorQueue(vendorId: string, data: VendorQueueJobData, options?: {
        concurrency?: number;
        attempts?: number;
        backoffDelay?: number;
    }): Promise<void>;
    addJobToVendorQueueWithRetry(vendorId: string, data: VendorQueueJobData, retryCount: number): Promise<void>;
    getVendorQueue(vendorId: string): Queue<VendorQueueJobData> | undefined;
    getAllVendorQueues(): Map<string, Queue<VendorQueueJobData>>;
    configureVendorConcurrency(vendorId: string, concurrency: number): Promise<void>;
    getQueueStats(vendorId: string): Promise<{
        vendorId: string;
        queueName: string;
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    } | null>;
    getAllQueueStats(): Promise<Array<{
        vendorId: string;
        queueName: string;
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }>>;
}
