import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type RecordRow = {
  id: string;
  recordType: "citation" | "warning" | "chalk";
  occurredAt: Date;
  officerNumber: string;
  locationName: string;
  violationLabel: string;
  fineAmount: string;
  plateState: string;
  plateNumber: string;
};

export function RecordTable({ records }: { records: RecordRow[] }) {
  return (
    <div className="panel">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Date</th>
            <th>Plate</th>
            <th>Location</th>
            <th>Violation</th>
            <th>Officer</th>
            <th>Fine</th>
          </tr>
        </thead>
        <tbody>
          {records.length ? (
            records.map((record) => (
              <tr key={record.id}>
                <td>
                  <Link href={`/citations/${record.id}`}>
                    <StatusBadge recordType={record.recordType} />
                  </Link>
                </td>
                <td>{formatDateTime(record.occurredAt)}</td>
                <td>
                  {record.plateState} {record.plateNumber}
                </td>
                <td>{record.locationName}</td>
                <td>{record.violationLabel}</td>
                <td>{record.officerNumber}</td>
                <td>{formatCurrency(record.fineAmount)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="muted">
                No records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
