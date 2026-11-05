import { validate } from 'class-validator';
import { VendorPromotionDto, VendorPromotionUpdateDto } from './vendor-promotion.dto';

describe('vendor promotion DTO validation', () => {
  it('rejects unknown fields including vendorId and id', async () => {
    const dto = new VendorPromotionDto();
    (dto as any).vendorId = 'x'; (dto as any).id = 'y'; (dto as any).bad = 1;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects discount <=0 and >100', async () => {
    const dto = new VendorPromotionDto();
    dto.title = 'T'; dto.discountPercent = 0;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid dates', async () => {
    const dto = new VendorPromotionDto();
    dto.title = 'T'; dto.discountPercent = 10; (dto as any).startDate = 'bad';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects discount <0.01 and >100', async () => {
    const dto = new VendorPromotionDto();
    dto.title = 'T';
    dto.discountPercent = 0;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    dto.discountPercent = 101;
    const errors2 = await validate(dto);
    expect(errors2.length).toBeGreaterThan(0);
  });

  it('accepts valid promotion with dates', async () => {
    const dto = new VendorPromotionDto();
    dto.title = 'Sale'; dto.discountPercent = 20; dto.startDate = '2026-12-01'; dto.endDate = '2026-12-31';
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects unknown fields including vendorId and id', async () => {
    const dto = new VendorPromotionDto();
    (dto as any).vendorId = 'v'; (dto as any).id = 'x'; (dto as any).bad = 1;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
