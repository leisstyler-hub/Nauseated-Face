import { Source } from './source.mjs';

// For datasets verified to have one complete inspection per row. Violation-row
// datasets must supply their own complete-event collector (as King County does).
export class SocrataInspectionSource extends Source {
  constructor(config, options = {}) { super(options); this.config = config; }
  async snapshot(scope) {
    if (scope?.type !== 'latest' || !Number.isInteger(scope.limit) || scope.limit < 1 || scope.limit > 100) throw new Error('Inspection source requires bounded latest scope (1..100)');
    const { origin, dataset, dateField, idField } = this.config;
    if (!/^https:\/\/[a-z0-9.-]+$/.test(origin) || !/^[a-z0-9]{4}-[a-z0-9]{4}$/.test(dataset) || ![dateField, idField].every(f => /^[a-z_][a-z0-9_]*$/.test(f))) throw new Error('Invalid Socrata configuration');
    const metadata = `${origin}/api/views/${dataset}.json`;
    const before = await this.json(metadata);
    if (!Number.isFinite(before.rowsUpdatedAt)) throw new Error('Missing source revision');
    const rows = [], urls = [metadata], seen = new Set();
    while (rows.length < scope.limit) {
      const limit = Math.min(this.pageSize, scope.limit - rows.length);
      const url = `${origin}/resource/${dataset}.json?${new URLSearchParams({ '$order': `${dateField} DESC,${idField} DESC`, '$limit': String(limit), '$offset': String(rows.length) })}`;
      urls.push(url);
      const page = await this.json(url);
      if (!Array.isArray(page) || page.length > limit) throw new Error('Invalid inspection page');
      for (const row of page) {
        if (typeof row[idField] !== 'string' || !row[idField] || seen.has(row[idField])) throw new Error('Missing or duplicate inspection identity');
        seen.add(row[idField]);
      }
      rows.push(...page);
      if (page.length < limit) break;
    }
    const after = await this.json(metadata);
    if (before.rowsUpdatedAt !== after.rowsUpdatedAt) throw new Error('Source dataset changed during pagination');
    return { rows, scope, revision: String(before.rowsUpdatedAt), urls };
  }
}
