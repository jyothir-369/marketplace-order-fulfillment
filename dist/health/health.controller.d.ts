import { DataSource } from 'typeorm';
interface HealthStatus {
    status: string;
    timestamp: string;
    uptime: number;
    database: {
        status: string;
        connected: boolean;
    };
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
}
export declare class HealthController {
    private readonly dataSource;
    private readonly startTime;
    constructor(dataSource: DataSource);
    getHealth(): Promise<HealthStatus>;
    getLiveness(): Promise<{
        status: string;
    }>;
    getReadiness(): Promise<{
        status: string;
        ready: boolean;
    }>;
}
export {};
