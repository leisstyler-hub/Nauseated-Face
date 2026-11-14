import { openStore, importSource, Source } from './index.mjs';
const [mode = 'all', value] = process.argv.slice(2);
const scope = mode === 'latest' ? { type: 'latest', limit: Number(value || 20) } : mode === 'business' ? { type: 'business', businessId: value } : { type: mode };
const store = openStore();
try { console.log(JSON.stringify(await importSource(store, new Source(), scope))); }
catch (error) { console.error(error.message); process.exitCode = 1; }
finally { store.close(); }
