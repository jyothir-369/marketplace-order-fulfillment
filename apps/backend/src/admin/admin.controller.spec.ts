import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';

describe('AdminController — vendor link routes (isolated controller-handler units)', () => {
  // Scope: handler argument routing / service delegation / error propagation.
  // NOT HTTP end-to-end: AuthGuard + RolesGuard middleware is overridden below.
  let controller: AdminController;
  let serviceMock: any;

  beforeEach(async () => {
    serviceMock = {
      linkUser: jest.fn().mockResolvedValue({ message: 'Linked', transitioned: true }),
      unlinkUser: jest.fn().mockResolvedValue({ message: 'Unlinked', transitioned: true }),
      listLinkedUsers: jest.fn().mockResolvedValue([{ id: 'u1', email: 'a@t', role: 'vendor', vendorId: 'v1' }]),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: serviceMock }],
    })
    .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<AdminController>(AdminController);
  });

  it('POST /vendors/:vendorId/users calls service with params + body + correlation', async () => {
    const res = await controller.linkUser('v-1', { email: 'buyer@test.dev' }, 'c-1');
    expect(serviceMock.linkUser).toHaveBeenCalledWith('v-1', 'buyer@test.dev', 'c-1');
    expect(res).toEqual({ message: 'Linked', transitioned: true });
  });

  it('DELETE /vendors/:vendorId/users/:userId calls service and propagates errors', async () => {
    serviceMock.unlinkUser.mockRejectedValueOnce(new Error('Not found'));
    await expect(controller.unlinkUser('v-1', 'u-2', 'c-2')).rejects.toThrow('Not found');
    expect(serviceMock.unlinkUser).toHaveBeenCalledWith('v-1', 'u-2', 'c-2');
  });

  it('GET /vendors/:vendorId/users returns linked-user array', async () => {
    const res = await controller.listLinkedUsers('v-1', 'c-3');
    expect(serviceMock.listLinkedUsers).toHaveBeenCalledWith('v-1', 'c-3');
    expect(res).toHaveLength(1);
  });
});
