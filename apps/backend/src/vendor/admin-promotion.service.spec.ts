import { AdminPromotionService } from './admin-promotion.service';

describe('Admin promotion atomic approval service', () => {
  let service: AdminPromotionService;
  let repo: {
    query: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      query: jest.fn().mockResolvedValue([{
        id: 'p-1',
        approval_state: 'APPROVED',
        approved_by: 'admin-1',
        approved_at: new Date(),
      }]),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    service = new AdminPromotionService(repo as any);
  });

  it('approves using one conditional SQL update', async () => {
    const result = await service.approve('p-1', 'admin-1');

    expect(repo.query).toHaveBeenCalledTimes(1);

    const [sql, params] = repo.query.mock.calls[0];

    expect(sql).toContain('UPDATE promotions');
    expect(sql).toContain("approval_state = 'PENDING'");
    expect(sql).toContain('RETURNING *');
    expect(params).toContain('admin-1');
    expect(params).toContain('p-1');
    expect(result).toBeDefined();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('does not use read-then-save for successful approval', async () => {
    await service.approve('p-1', 'admin-1');

    expect(repo.findOne).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('preserves the database returned approval audit fields', async () => {
    const result = await service.approve('p-1', 'admin-1');

    expect(result.approved_by).toBe('admin-1');
    expect(result.approved_at).toBeInstanceOf(Date);
  });
});