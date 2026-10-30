import { describe, it, expect } from '@jest/globals';
import { assertNoTruncateInFixtureQuery } from './fixture-setup-guard';

describe('Fixture mechanism — no truncate / no delete guard', () => {
  it('allows safe SELECT/INSERT queries', () => {
    expect(() => assertNoTruncateInFixtureQuery("SELECT * FROM products")).not.toThrow();
    expect(() => assertNoTruncateInFixtureQuery("INSERT INTO categories (name) VALUES ('test')")).not.toThrow();
  });

  it('refuses queries containing truncate', () => {
    expect(() => assertNoTruncateInFixtureQuery("TRUNCATE TABLE products CASCADE")).toThrow(/FAIL-CLOSED/);
  });

  it('refuses queries containing delete from', () => {
    expect(() => assertNoTruncateInFixtureQuery("DELETE FROM products WHERE id > 10")).toThrow(/FAIL-CLOSED/);
  });

  it('refuses queries containing drop table', () => {
    expect(() => assertNoTruncateInFixtureQuery("DROP TABLE products")).toThrow(/FAIL-CLOSED/);
  });
});
