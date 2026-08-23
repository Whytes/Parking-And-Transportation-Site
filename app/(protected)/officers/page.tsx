import { OfficersManager } from "@/components/officers-manager";
import { requirePermission } from "@/lib/authz";
import { getOfficers } from "@/lib/data";

export default async function OfficersPage() {
  await requirePermission("officers");
  const officers = await getOfficers();

  return <OfficersManager officers={officers} />;
}
