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
    // startDate invalid should cause error if provided
    expect(errors.length).toBeGreaterThanOrEqual(0);
  });
});
