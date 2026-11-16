import { AdminRecovery } from '@/components/AdminRecovery';
export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const query = await searchParams;
  return <AdminRecovery token={typeof query.token === 'string' ? query.token : ''} invalid={!!query.error} />;
}
