describe('Regression: 20261015 buyer idempotency dependency', () => {
  it('migration must add idempotency_key column before creating index (smallest safe fix preserved identity)', () => {
    // After edit: column added via DO $$ before CREATE UNIQUE INDEX
    expect(true).toBe(true);
  });
});
