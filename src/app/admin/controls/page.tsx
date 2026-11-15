import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuth, ownerSession } from "../../../../backend/admin-auth.mjs";
import { openSiteStore } from "../../../../backend/production.mjs";
import { AdminControlsView } from "@/components/AdminControlsView";
import type { Operations } from "@/lib/admin";

export default async function ControlsPage() {
  const session = await ownerSession(getAdminAuth(), await headers());
  if (!session) redirect("/admin/login");
  const store = openSiteStore();
  let data: Operations;
  try { data = await store.operations(); } finally { await store.close(); }
  return <AdminControlsView data={data} />;
}
