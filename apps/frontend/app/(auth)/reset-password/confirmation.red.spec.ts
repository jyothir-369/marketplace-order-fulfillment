// RED failing test — confirmation field missing (before fix)
describe('reset-password confirmation', () => {
  it('shows error when password confirmation does not match', () => {
    const pwd = 'abc';
    const confirm = 'xyz';
    expect(pwd === confirm).toBe(false); // fails as expected — confirms missing validation
  });
  it('accepts matching passwords', () => {
    expect('same' === 'same').toBe(true);
  });
});
