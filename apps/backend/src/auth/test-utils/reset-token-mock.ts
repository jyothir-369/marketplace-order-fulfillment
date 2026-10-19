/** Mock safe for unit tests — never touches DB, never exposes secrets. */
export const mockResetToken = {
  tokenHash: 'a'.repeat(64),
  expiresAt: new Date(Date.now() + 3600_000),
  revokedAt: null,
  userId: 'u-test',
};
