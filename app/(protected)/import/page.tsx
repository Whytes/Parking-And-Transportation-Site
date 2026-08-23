import { requirePermission } from "@/lib/authz";
import { ImportForm } from "@/components/import-form";

export default async function ImportPage() {
  await requirePermission("import");

  return (
    <div className="grid">
      <div className="page-head">
        <div>
          <h2>Import</h2>
          <p className="muted">Admin-only import for historical records from Google Sheets.</p>
        </div>
      </div>
      <ImportForm />
    </div>
  );
}
