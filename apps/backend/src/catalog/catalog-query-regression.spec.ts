import { CatalogService } from './catalog.service';
describe('Catalog regression', () => {
  it('service exports CatalogService', () => {
    expect(typeof CatalogService).toBe('function');
  });
});
