import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminPromotionService } from './admin-promotion.service';
import { Promotion } from '../common/entities/promotion.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('Admin promotion atomic approval (atomic conditional DB transition)', () => {
  let svc: AdminPromotionService;
  let repo: Repository<Promotion>;

  beforeEach(async () => {
    const mockRepo = {
      query: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes("UPDATE promotions") && sql.includes("PENDING")) {
          // Conditional UPDATE matches only rows currently in PENDING state.
          // Model RETURNING * accurately: matching row yields result; non-matching row / missing row yields [].
          const targetState = sql.includes("'APPROVED'") ? 'APPROVED' : (sql.includes("'REJECTED'") ? 'REJECTED' : 'PENDING');
          if (params[1] === 'bad') return [];          // promote id absent
          if (params[1] === 'done') return [];        // id exists but not PENDING (non-atomic non-match)
          return [{ id: params[1], approval_state: targetState, approved_by: params[0], approved_at: new Date() }];
        }
        return [];
      }),
      findOne: jest.fn().mockImplementation(async ({ where }: any) => {
        if (where?.id === 'bad') return null;
        if (where?.id === 'done') return { id: 'done', approvalState: 'APPROVED' };
        return { id: 'p', approvalState: 'PENDING' };
      }),
    };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [AdminPromotionService, { provide: getRepositoryToken(Promotion), useValue: mockRepo }],
    }).compile();
    svc = mod.get(AdminPromotionService);
    repo = mod.get(getRepositoryToken(Promotion));
  });

  it('approve succeeds from PENDING with conditional update (atomic)', async () => {
    const r = await svc.approve('p', 'a1');
    expect(r.approval_state || r.approvalState).toBe('APPROVED');
    expect((repo.query as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    expect((repo.query as jest.Mock).mock.calls[0][0]).toContain('PENDING');
  });

  it('reject succeeds from PENDING', async () => {
    const r = await svc.reject('p', 'a1');
    expect(r.approval_state || r.approvalState).toBe('REJECTED');
  });

  it('invalid transition APPROVED -> approve throws correct error preserving approvedBy', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue({ id: 'done', approvalState: 'APPROVED', approvedBy: 'orig', approvedAt: new Date() });
    await expect(svc.approve('done','a')).rejects.toThrow(BadRequestException);
  });

  it('invalid transition REJECTED -> reject throws', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue({ id: 'done', approvalState: 'REJECTED' });
    await expect(svc.reject('done','a')).rejects.toThrow(BadRequestException);
  });

  it('missing promo not found', async () => {
    (repo.query as jest.Mock).mockImplementation(async () => []);
    (repo.findOne as jest.Mock).mockResolvedValue(null);
    await expect(svc.approve('bad','a')).rejects.toThrow(NotFoundException);
  });

  it('concurrent non-PENDING transition preserved (approvedBy not overwritten on error)', async () => {
    // The new logic never calls save on failure; findOne only reads for error message.
    const done = { id: 'done', approvalState: 'APPROVED', approvedBy: 'preserved', approvedAt: new Date() };
    (repo.findOne as jest.Mock).mockResolvedValue(done);
    await expect(svc.approve('done','new')).rejects.toThrow(BadRequestException);
    expect(done.approvedBy).toBe('preserved');
  });
});
