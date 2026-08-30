import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
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

@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async getHealth(): Promise<HealthStatus> {
    const memoryUsage = process.memoryUsage();
    const memoryTotal = memoryUsage.heapTotal;
    const memoryUsed = memoryUsage.heapUsed;
    const memoryPercentage = (memoryUsed / memoryTotal) * 100;

    let dbStatus = 'disconnected';
    let dbConnected = false;

    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        dbStatus = 'connected';
        dbConnected = true;
      }
    } catch (error) {
      dbStatus = 'error: ' + (error instanceof Error ? error.message : 'Unknown error');
    }

    return {
      status: dbConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      database: {
        status: dbStatus,
        connected: dbConnected,
      },
      memory: {
        used: Math.round(memoryUsed / 1024 / 1024),
        total: Math.round(memoryTotal / 1024 / 1024),
        percentage: Math.round(memoryPercentage * 100) / 100,
      },
    };
  }

  @Get('live')
  async getLiveness(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  @Get('ready')
  async getReadiness(): Promise<{ status: string; ready: boolean }> {
    let ready = false;

    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        ready = true;
      }
    } catch (error) {
      ready = false;
    }

    return {
      status: ready ? 'ready' : 'not_ready',
      ready,
    };
  }
}