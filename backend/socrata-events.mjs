import { Source } from './source.mjs';

const literal = value => `'${String(value).replaceAll("'", "''")}'`;

// Select inspections first, then collect every source row for those events.
// Socrata's system row ID is provenance, never an inspection identifier.
export class SocrataEventSource extends Source {
  constructor(config, options = {}) { super(options); this.config = config; }

  async snapshot(scope) {
    const { origin, dataset, dateField, eventFields } = this.config;
    if (!/^https:\/\/[a-z0-9.-]+$/.test(origin) || !/^[a-z0-9]{4}-[a-z0-9]{4}$/.test(dataset) ||
        !Array.isArray(eventFields) || !eventFields.length || ![dateField, ...eventFields].every(f => f === ':id' || /^[a-z_][a-z0-9_]*$/.test(f))) throw new Error('Invalid Socrata event configuration');
    if (scope?.type !== 'all' && (scope?.type !== 'latest' || !Number.isInteger(scope.limit) || scope.limit < 1 || scope.limit > 100)) throw new Error('Event source requires all or bounded latest scope');
    if (!Number.isInteger(this.pageSize) || this.pageSize < 1 || this.pageSize > 10000) throw new Error('Invalid source page size');
    const metadata = `${origin}/api/views/${dataset}.json`;
    const urls = [metadata];
    const before = await this.json(metadata);
    if (!Number.isFinite(before.rowsUpdatedAt)) throw new Error('Missing source revision');
    const get = async params => {
      const url = `${origin}/resource/${dataset}.json?${new URLSearchParams(params)}`;
      urls.push(url);
      return this.json(url);
    };
    let where;
    let selected;
    if (scope.type === 'latest') {
      const filters=[`${dateField} IS NOT NULL`];
      if(this.config.excludeFuture){const tomorrow=new Date();tomorrow.setUTCDate(tomorrow.getUTCDate()+1);filters.push(`${dateField} < '${tomorrow.toISOString().slice(0,10)}T00:00:00.000'`);}
      if(this.config.latestWhere)filters.push(`(${this.config.latestWhere})`);
      selected = await get({ '$select': eventFields.join(','), '$group': eventFields.join(','), '$where': filters.join(' AND '),
        '$order': `max(${dateField}) DESC,${eventFields.join(',')}`, '$limit': String(scope.limit) });
      if (!Array.isArray(selected) || selected.length > scope.limit || selected.some(row => eventFields.some(f => typeof row[f] !== 'string' || !row[f]))) throw new Error('Missing event identity');
      const keys = selected.map(row => JSON.stringify(eventFields.map(f => row[f])));
      if (new Set(keys).size !== keys.length) throw new Error('Duplicate selected event identity');
      where = selected.length ? selected.map(row => `(${eventFields.map(f => `${f}=${literal(row[f])}`).join(' AND ')})`).join(' OR ') : '1=0';
    }
    const filter = where ? { '$where': where } : {};
    const counts = await get({ ...filter, '$select': 'count(*) AS count' });
    const countText = counts?.[0]?.count;
    const count = Number(countText);
    if (!Array.isArray(counts) || counts.length !== 1 || !/^\d+$/.test(String(countText)) || !Number.isSafeInteger(count)) throw new Error('Invalid source row count');
    const rows = [], seen = new Set(), events = new Set();
    const selectedKeys = selected && new Set(selected.map(row => JSON.stringify(eventFields.map(f => row[f]))));
    for (let offset = 0; offset < count; offset += this.pageSize) {
      const limit = Math.min(this.pageSize, count - offset);
      const page = await get({ ...filter, '$select': '*, :id', '$order': ':id', '$limit': String(limit), '$offset': String(offset) });
      if (!Array.isArray(page) || page.length !== limit) throw new Error('Incomplete source page');
      for (const row of page) {
        if (typeof row[':id'] !== 'string' || !row[':id'] || seen.has(row[':id'])) throw new Error('Missing or duplicate source row identity');
        if (eventFields.some(f => typeof row[f] !== 'string' || !row[f])) throw new Error('Missing event identity');
        const key = JSON.stringify(eventFields.map(f => row[f]));
        if (selectedKeys && !selectedKeys.has(key)) throw new Error('Source row outside selected events');
        events.add(key); seen.add(row[':id']); rows.push(row);
      }
    }
    if (selectedKeys && events.size !== selectedKeys.size) throw new Error('Selected event missing source rows');
    const after = await this.json(metadata);
    if (before.rowsUpdatedAt !== after.rowsUpdatedAt) throw new Error('Source dataset changed during pagination');
    return { rows, scope, revision: String(before.rowsUpdatedAt), urls };
  }
}
