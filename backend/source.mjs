export const SOURCE = 'https://data.kingcounty.gov/resource/r878-4sxa.json';
const META = 'https://data.kingcounty.gov/api/views/r878-4sxa.json';
const literal = value => `'${String(value).replaceAll("'", "''")}'`;

export class Source {
  constructor({ fetcher = fetch, pageSize = 1000, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
    this.fetcher = fetcher;
    this.pageSize = pageSize;
    this.sleep = sleep;
  }
  async json(url) {
    for (let attempt = 0; attempt < 4; attempt++) {
      let response;
      try { response = await this.fetcher(url, { signal: AbortSignal.timeout(30000), headers: { Accept: 'application/json' } }); }
      catch (error) {
        if (attempt === 3) throw error;
        await this.sleep(500 * 2 ** attempt);
        continue;
      }
      if (response.ok) return response.json();
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 3) throw new Error(`Official API HTTP ${response.status}`);
      const retry = response.headers.get('retry-after');
      const seconds = Number(retry);
      const requested = retry === null ? 500 * 2 ** attempt : Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retry) - Date.now();
      await this.sleep(Math.min(30000, Math.max(0, Number.isFinite(requested) ? requested : 1000)));
    }
  }
  async pages(params, urls) {
    const rows = [];
    const seen = new Set();
    for (let offset = 0; ; offset += this.pageSize) {
      const url = `${SOURCE}?${new URLSearchParams({ ...params, '$limit': String(this.pageSize), '$offset': String(offset) })}`;
      urls.push(url);
      const page = await this.json(url);
      if (!Array.isArray(page)) throw new Error('Official API returned a non-array');
      for (const row of page) {
        if (!row[':id'] || seen.has(row[':id'])) throw new Error('Missing or repeated source row in pagination');
        seen.add(row[':id']);
      }
      rows.push(...page);
      if (page.length < this.pageSize) return rows;
    }
  }
  async snapshot(scope = { type: 'all' }) {
    const before = await this.json(META);
    if (!Number.isFinite(before.rowsUpdatedAt)) throw new Error('Missing source revision metadata');
    const urls = [META];
    let rows;
    if (scope.type === 'latest') {
      if (!Number.isInteger(scope.limit) || scope.limit < 1 || scope.limit > 100) throw new Error('Latest limit must be 1..100');
      const url = `${SOURCE}?${new URLSearchParams({ '$select': 'business_id,inspection_serial_num,max(inspection_date) AS latest_date', '$group': 'business_id,inspection_serial_num', '$order': 'latest_date DESC,business_id,inspection_serial_num', '$limit': String(scope.limit) })}`;
      urls.push(url);
      const keys = await this.json(url);
      if (!Array.isArray(keys)) throw new Error('Invalid inspection index');
      rows = [];
      for (const key of keys) {
        if (!key.business_id || !key.inspection_serial_num) throw new Error('Source has an inspection without a stable key');
        rows.push(...await this.pages({ '$select': '*, :id', '$where': `business_id=${literal(key.business_id)} AND inspection_serial_num=${literal(key.inspection_serial_num)}`, '$order': ':id' }, urls));
      }
    } else if (scope.type === 'all' || scope.type === 'business') {
      if (scope.type === 'business' && !scope.businessId) throw new Error('Business ID required');
      rows = await this.pages({ '$select': '*, :id', '$order': ':id', ...(scope.type === 'business' ? { '$where': `business_id=${literal(scope.businessId)}` } : {}) }, urls);
    } else throw new Error('Unknown import scope');
    const after = await this.json(META);
    if (before.rowsUpdatedAt !== after.rowsUpdatedAt) throw new Error('Source dataset changed during pagination; rerun import');
    return { rows, scope, revision: String(before.rowsUpdatedAt), urls };
  }
}
