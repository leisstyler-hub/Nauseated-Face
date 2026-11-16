import { writeFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { PostgresStore } from './postgres-store.mjs';
import { runNationalPilot } from './national-pilot.mjs';
const db = new PGlite();
const client = { query: (sql, params) => params ? db.query(sql, params) : db.exec(sql).then(r => r.at(-1)), release() {} };
const store = new PostgresStore({ ...client, connect: async () => client });
try {
  const evidence = { verifiedAt: new Date().toISOString(), environment: 'isolated local PGlite; not hosted Neon', ...await runNationalPilot(store) };
  writeFileSync(new URL('../docs/NATIONAL_SOURCE_VALIDATION.json', import.meta.url), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
} finally { await db.close(); }
