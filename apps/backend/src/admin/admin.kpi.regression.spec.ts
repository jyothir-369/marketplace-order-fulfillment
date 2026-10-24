/** Regression — Admin KPI endpoint (2026-10-23). Verifies /admin/kpi contract. */
import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';

describe('AdminController.getKPI regression', () => {
  let controller: AdminController;
  let mockService: any;
  beforeEach(async () => {
    mockService = {
      getKPI: jest.fn().mockResolvedValue({
        aov: 99.5, activeVendors: 4, pendingApplications: 2, fulfillmentRate: 85,
        categoryTrends: [{ category: 'Electronics', count: 12 }],
        vendorTrends: [{ vendorName: 'Electronics World', productCount: 5 }],
        operationalAlerts: [{ type: 'pending-applications', message: '2 pending', severity: 'info' }],
        recentActivity: [{ label: 'Order 123 fulfilled', timestamp: new Date().toISOString() }],
      }),
    };
    const module = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get(AdminController);
  });
  it('delegates to service.getKPI and returns full KPI payload', async () => {
    const res = await controller.getKPI('c1');
    expect(mockService.getKPI).toHaveBeenCalledWith('c1');
    expect(res.aov).toBe(99.5);
    expect(res.activeVendors).toBe(4);
    expect(res.categoryTrends.length).toBeGreaterThan(0);
    expect(res.vendorTrends.length).toBeGreaterThan(0);
    expect(res.recentActivity.length).toBeGreaterThan(0);
  });
  it('returns safe empty state when service returns minimal payload', async () => {
    mockService.getKPI.mockResolvedValueOnce({ aov: 0, activeVendors: 0, pendingApplications: 0, fulfillmentRate: 0, categoryTrends: [], vendorTrends: [], operationalAlerts: [], recentActivity: [] });
    const res = await controller.getKPI('c2');
    expect(res.fulfillmentRate).toBe(0);
    expect(res.categoryTrends).toEqual([]);
  });
});
