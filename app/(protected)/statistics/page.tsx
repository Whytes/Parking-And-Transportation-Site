import { StatisticsDashboard } from "@/components/statistics-dashboard";
import { requirePermission } from "@/lib/authz";
import { listRecords } from "@/lib/data";

export default async function StatisticsPage({
  searchParams
}: {
  searchParams: Promise<{ range?: string; start?: string; end?: string; location?: string; violation?: string }>;
}) {
  await requirePermission("statistics");
  const records = await listRecords();
  const params = await searchParams;

  return (
    <StatisticsDashboard
      initialFilters={{
        rangePreset: (params.range as "all" | "7" | "30" | "90" | "custom") || "all",
        customStartDate: params.start ?? "",
        customEndDate: params.end ?? "",
        locationFilter: params.location ?? "all",
        violationFilter: params.violation ?? "all"
      }}
      records={records.map((record) => ({
        id: record.id,
        recordType: record.recordType,
        occurredAt: record.occurredAt.toISOString(),
        officerNumber: record.officerNumber,
        locationName: record.locationName,
        violationLabel: record.violationLabel,
        fineAmount: String(record.fineAmount),
        voidedAt: record.voidedAt ? record.voidedAt.toISOString() : null,
        plateState: record.plateState,
        plateNumber: record.plateNumber
      }))}
    />
  );
}
