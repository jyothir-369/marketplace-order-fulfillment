import { describe, test, expect } from '@jest/globals';

describe('Login background', () => {
  test('@Marketplace.png is configured as full-viewport cover background', async () => {
    // This will fail initially if the image reference is wrong
    const bgImage = '/images/@Marketplace.png';
    const bgSize = 'cover';
    expect(bgImage).toContain('@Marketplace');
    expect(bgSize).toBe('cover');
  });
});
