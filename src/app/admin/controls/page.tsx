import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuth, ownerSession } from "../../../../backend/admin-auth.mjs";
import { openSiteStore } from "../../../../backend/production.mjs";
import { AdminControlsView } from "@/components/AdminControlsView";
import type { Operations } from "@/lib/admin";
import { websiteEnabled } from "../../../../backend/website-availability.mjs";

export default async function ControlsPage() {
  const auth = getAdminAuth();
  const session = await ownerSession(auth, await headers());
  if (!session) redirect("/admin/login");
  const store = openSiteStore();
  let data: Operations;
  try { data = await store.operations(); } finally { await store.close(); }
  const enabled = await websiteEnabled(auth.options.database);
  return <AdminControlsView data={data} websiteEnabled={enabled} />;
}
