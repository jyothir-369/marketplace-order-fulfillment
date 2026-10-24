/**
 * Regression — Admin KPI endpoint (2026-10-23). Offline; no DB/network.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';

describe('AdminController.getKPI', () => {
  let controller: AdminController;
  let mockService: any;
  beforeEach(async () => {
    mockService = {
      getKPI: jest.fn().mockResolvedValue({
        aov: 99.5, activeVendors: 4, pendingApplications: 2, fulfillmentRate: 85,
        categoryTrends: [], vendorTrends: [], operationalAlerts: [], recentActivity: [],
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
  it('delegates to getKPI', async () => {
    await controller.getKPI('c1');
    expect(mockService.getKPI).toHaveBeenCalledWith('c1');
  });
});
