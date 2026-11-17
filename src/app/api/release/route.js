import { ADAPTERS } from '../../../../backend/adapters/index.mjs';
import { connection } from 'next/server';

// Public release identity only; no configuration, account or credential values.
export async function GET() {
  await connection();
  return Response.json({commitSha:process.env.VERCEL_GIT_COMMIT_SHA??null,adapterIds:Object.keys(ADAPTERS)}, {headers:{'Cache-Control':'no-store'}});
}
