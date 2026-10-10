import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerAddressService } from './customer-address.service';
import { CustomerAddress } from './customer-address.entity';

function buildMockRepo(initial = []) {
  const store = [...initial];
  return {
    find: async ({ where }) => store.filter(s => { if (where?.userId && s.userId !== where.userId) return false; if (where?.label && s.label !== where.label) return false; return true; }),
    findOne: async ({ where }) => store.find(s => { if (where.id && s.id !== where.id) return false; if (where.userId && s.userId !== where.userId) return false; if (where.label && s.label !== where.label) return false; return true; }) || null,
    create: (e) => e,
    save: async (e) => { if (!e.id) e.id = 'addr-' + store.length; store.push(e); return e; },
    remove: async (e) => { const i = store.indexOf(e); if (i >= 0) store.splice(i, 1); return e; },
  };
}

describe('CustomerAddressService', () => {
  let service: CustomerAddressService;
  let repo: Repository<CustomerAddress>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CustomerAddressService,
        { provide: getRepositoryToken(CustomerAddress), useValue: buildMockRepo() },
      ],
    }).compile();
    service = module.get(CustomerAddressService);
    repo = module.get(getRepositoryToken(CustomerAddress));
  });

  it('lists addresses for user', async () => {
    const res = await service.list('u-1');
    expect(Array.isArray(res)).toBe(true);
  });

  it('creates address with ownership', async () => {
    const res = await service.create('u-1', { label: 'Home', street: '123', city: 'C' });
    expect(res.userId).toBe('u-1');
  });

  it('rejects duplicate label for same user', async () => {
    await service.create('u-1', { label: 'Dup', street: 'S', city: 'C' });
    await expect(service.create('u-1', { label: 'Dup', street: 'S2', city: 'C2' })).rejects.toThrow();
  });

  it('does not allow cross-user access on find', async () => {
    const addr = await service.create('u-1', { label: 'Home', street: 'S', city: 'C' });
    await expect(service.findOne('u-2', addr.id)).rejects.toThrow();
  });

  it('updates owned address', async () => {
    const addr = await service.create('u-1', { label: 'Home', street: 'S', city: 'C' });
    const res = await service.update('u-1', addr.id, { city: 'New' });
    expect(res.city).toBe('New');
  });

  it('deletes owned address', async () => {
    const addr = await service.create('u-1', { label: 'X', street: 'S', city: 'C' });
    await service.delete('u-1', addr.id);
  });
});
