import { createServer } from 'node:http';
import { openStore, handleRead } from './index.mjs';
const store = openStore();
const server = createServer(async (req, res) => {
  try {
    const result = await handleRead(store, new Request(`http://localhost${req.url}`, { method: req.method }));
    res.writeHead(result.status, Object.fromEntries(result.headers));
    res.end(await result.text());
  } catch {
    res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ error: 'Local inspection storage unavailable' }));
  }
});
server.listen(Number(process.env.PORT || 3100), '127.0.0.1', () => console.log('Inspection API listening on localhost'));
