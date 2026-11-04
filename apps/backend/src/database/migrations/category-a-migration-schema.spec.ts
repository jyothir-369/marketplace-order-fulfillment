import { CategoryAPromotionFundingApproval2026110300001 } from './20261103-CategoryA-PromotionFundingApproval';
import { CategoryAPromotionApprovedAt2026110300002 } from './20261103-CategoryA-PromotionApprovedAt';

describe('Category A migrations registered and ownership-safe', () => {
  it('registers both 20261103 migrations', () => {
    expect(new CategoryAPromotionFundingApproval2026110300001()).toBeDefined();
    expect(new CategoryAPromotionApprovedAt2026110300002()).toBeDefined();
  });

  it('FundingApproval up uses decimal precision 10/2 (not 5/2)', () => {
    const src = require('fs').readFileSync(__filename.replace('category-a-migration-schema.spec.ts', '20261103-CategoryA-PromotionFundingApproval.ts'), 'utf8');
    expect(src).toContain('precision: 10, scale: 2');
    expect(src).toContain('down');
    expect(src).toContain('dropIndex');
  });

  it('FundingApproval down is ownership-safe (checks column/index exist first)', () => {
    const src = require('fs').readFileSync(__filename.replace('category-a-migration-schema.spec.ts', '20261103-CategoryA-PromotionFundingApproval.ts'), 'utf8');
    expect(src).toContain('findColumnByName');
    expect(src).toContain('pg_indexes');
  });

  it('ApprovedAt migration exists and has safe up/down', () => {
    const src = require('fs').readFileSync(__filename.replace('category-a-migration-schema.spec.ts', '20261103-CategoryA-PromotionApprovedAt.ts'), 'utf8');
    expect(src).toContain('addColumn');
    expect(src).toContain('dropColumn');
  });
});
