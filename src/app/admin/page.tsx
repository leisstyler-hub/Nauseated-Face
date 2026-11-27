import type { Operations } from "@/lib/admin";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuth, ownerSession } from "../../../backend/admin-auth.mjs";
import { openSiteStore } from "../../../backend/production.mjs";
import { AdminOverview } from "@/components/AdminOverview";

export default async function AdminPage() {
  const session = await ownerSession(getAdminAuth(), await headers());
  if (!session) redirect("/admin/login");
  const store = openSiteStore();
  let data: Pick<Operations, 'counts'>;
  try { data = { counts: await store.inspectionCounts() }; } finally { await store.close(); }
  return <AdminOverview data={data} email={session.user.email} />;
}
