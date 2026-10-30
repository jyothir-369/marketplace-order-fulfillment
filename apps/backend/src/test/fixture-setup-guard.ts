/**
 * Fail-closed protection for fixture setup SQL.
 *
 * Fixture setup must not perform destructive table-wide operations.
 * Use isolated databases and ownership-scoped cleanup instead.
 */
export function assertNoTruncateInFixtureQuery(query: string): void {
  if (typeof query !== 'string') {
    throw new TypeError(
      'FAIL-CLOSED: Fixture SQL query must be a string.',
    );
  }

  const destructiveStatement =
    /\b(?:TRUNCATE(?:\s+TABLE)?|DELETE\s+FROM|DROP\s+TABLE)\b/i;

  if (destructiveStatement.test(query)) {
    throw new Error(
      'FAIL-CLOSED: Destructive SQL is forbidden in fixture setup queries.',
    );
  }
}