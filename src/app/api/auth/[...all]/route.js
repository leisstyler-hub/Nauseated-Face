import { adminRequest } from '../../../../../backend/admin-auth.mjs';

async function handle(request) {
  return adminRequest(request);
}
export const GET = handle;
export const POST = handle;
