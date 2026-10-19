const fs = require('fs');
let s = fs.readFileSync('apps/backend/src/database/migrations/datasource.ts', 'utf8');
s = s.replace("  const url = process.env.MIGRATION_TEST_DATABASE_URL;", "  const urlStr = process.env.MIGRATION_TEST_DATABASE_URL;");
s = s.replace("  if (!url || url.trim() === '') return null;", "  if (!urlStr || urlStr.trim() === '') { throw new Error('FAIL-CLOSED: MIGRATION_TEST_DATABASE_URL missing or empty'); }");
console.log('After replacements, FAIL-CLOSED:', (s.match(/FAIL-CLOSED/g) || []).length);
fs.writeFileSync('apps/backend/src/database/migrations/datasource.ts', s, 'utf8');
console.log('Written');
