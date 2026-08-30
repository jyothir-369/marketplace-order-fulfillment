"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
let HealthController = class HealthController {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.startTime = Date.now();
    }
    async getHealth() {
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
        }
        catch (error) {
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
    async getLiveness() {
        return { status: 'ok' };
    }
    async getReadiness() {
        let ready = false;
        try {
            if (this.dataSource.isInitialized) {
                await this.dataSource.query('SELECT 1');
                ready = true;
            }
        }
        catch (error) {
            ready = false;
        }
        return {
            status: ready ? 'ready' : 'not_ready',
            ready,
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('live'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getLiveness", null);
__decorate([
    (0, common_1.Get)('ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getReadiness", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], HealthController);
//# sourceMappingURL=health.controller.js.map