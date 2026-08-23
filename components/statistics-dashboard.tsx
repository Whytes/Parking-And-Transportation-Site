"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type StatisticsRecord = {
  id: string;
  recordType: "citation" | "warning" | "chalk";
  occurredAt: string;
  officerNumber: string;
  locationName: string;
  violationLabel: string;
  fineAmount: string;
  voidedAt: string | null;
  plateState: string;
  plateNumber: string;
};

type Slice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

const locationColors = ["#184da7", "#3c7cff", "#8ab4ff", "#4f46e5", "#0f766e", "#7c3aed", "#b45309", "#be185d"];
function buildPieSegments(slices: Slice[], radius: number) {
  const format = (value: number) => Number(value.toFixed(6));
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  let currentAngle = -Math.PI / 2;

  return slices.map((slice) => {
    const angle = (slice.value / total) * Math.PI * 2;
    const startX = format(50 + Math.cos(currentAngle) * radius);
    const startY = format(50 + Math.sin(currentAngle) * radius);
    const endAngle = currentAngle + angle;
    const endX = format(50 + Math.cos(endAngle) * radius);
    const endY = format(50 + Math.sin(endAngle) * radius);
    const largeArcFlag = angle > Math.PI ? 1 : 0;
    const path = `M 50 50 L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
    currentAngle = endAngle;

    return {
      ...slice,
      path
    };
  });
}

function PieChart({
  title,
  slices,
  legendLimit,
  selectedKey,
  onSelect
}: {
  title: string;
  slices: Slice[];
  legendLimit?: number;
  selectedKey?: string;
  onSelect?: (key: string) => void;
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const segments = buildPieSegments(slices, 42);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const activeKey = hoveredKey ?? selectedKey ?? null;
  const activeSlice = slices.find((slice) => slice.key === activeKey) ?? null;

  const legendSlices = useMemo(() => {
    if (!legendLimit || slices.length <= legendLimit) {
      return slices;
    }

    const focusKey = selectedKey ?? hoveredKey;

    if (!focusKey) {
      return slices.slice(0, legendLimit);
    }

    const focusIndex = slices.findIndex((slice) => slice.key === focusKey);

    if (focusIndex === -1) {
      return slices.slice(0, legendLimit);
    }

    let start = Math.max(0, focusIndex - Math.floor(legendLimit / 2));
    let end = start + legendLimit;

    if (end > slices.length) {
      end = slices.length;
      start = Math.max(0, end - legendLimit);
    }

    return slices.slice(start, end);
  }, [hoveredKey, legendLimit, selectedKey, slices]);

  return (
    <section className="panel grid">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <h3>{title}</h3>
      </div>
      <div className="chart-layout">
        <svg viewBox="0 0 100 100" className="pie-chart" aria-label={title}>
          {segments.map((segment) => (
            <path
              key={segment.key}
              d={segment.path}
              fill={segment.color}
              className={activeKey === segment.key ? "pie-segment pie-segment-active" : "pie-segment"}
              onClick={() => onSelect?.(segment.key)}
              onMouseEnter={() => setHoveredKey(segment.key)}
              onMouseLeave={() => setHoveredKey(null)}
            />
          ))}
          <circle cx="50" cy="50" r="18" fill="white" />
          <text x="50" y="48" textAnchor="middle" className="pie-total-label">
            {activeSlice ? activeSlice.value : total}
          </text>
          <text x="50" y="56" textAnchor="middle" className="pie-total-subtitle">
            {activeSlice ? activeSlice.label : "total"}
          </text>
        </svg>
        <div className="chart-legend">
          {legendSlices.map((slice) => (
            <button
              key={slice.key}
              type="button"
              className={activeKey === slice.key ? "legend-row legend-row-active" : "legend-row"}
              onClick={() => onSelect?.(slice.key)}
            >
              <span className="legend-dot" style={{ background: slice.color }} />
              <span>{slice.label}</span>
              <strong>{slice.value}</strong>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StatisticsDashboard({
  records,
  initialFilters
}: {
  records: StatisticsRecord[];
  initialFilters: {
    rangePreset: "all" | "7" | "30" | "90" | "custom";
    customStartDate: string;
    customEndDate: string;
    locationFilter: string;
    violationFilter: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [rangePreset, setRangePreset] = useState<"all" | "7" | "30" | "90" | "custom">(initialFilters.rangePreset);
  const [customStartDate, setCustomStartDate] = useState(initialFilters.customStartDate);
  const [customEndDate, setCustomEndDate] = useState(initialFilters.customEndDate);
  const [locationFilter, setLocationFilter] = useState(initialFilters.locationFilter);
  const [violationFilter, setViolationFilter] = useState(initialFilters.violationFilter);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    rangePreset === "all" ? params.delete("range") : params.set("range", rangePreset);
    customStartDate ? params.set("start", customStartDate) : params.delete("start");
    customEndDate ? params.set("end", customEndDate) : params.delete("end");
    locationFilter === "all" ? params.delete("location") : params.set("location", locationFilter);
    violationFilter === "all" ? params.delete("violation") : params.set("violation", violationFilter);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [customEndDate, customStartDate, locationFilter, pathname, rangePreset, router, searchParams, violationFilter]);

  const filteredRecords = useMemo(() => {
    const now = new Date();

    return records.filter((record) => {
      if (record.voidedAt) {
        return false;
      }

      const occurredAt = new Date(record.occurredAt);

      if (rangePreset === "7" || rangePreset === "30" || rangePreset === "90") {
        const days = Number(rangePreset);
        const start = new Date(now);
        start.setDate(now.getDate() - days);
        return occurredAt >= start;
      }

      if (rangePreset === "custom") {
        if (customStartDate && occurredAt < new Date(`${customStartDate}T00:00:00`)) {
          return false;
        }

        if (customEndDate && occurredAt > new Date(`${customEndDate}T23:59:59.999`)) {
          return false;
        }
      }

      if (locationFilter !== "all" && record.locationName !== locationFilter) {
        return false;
      }

      if (violationFilter !== "all" && record.violationLabel !== violationFilter) {
        return false;
      }

      return true;
    });
  }, [customEndDate, customStartDate, locationFilter, rangePreset, records, violationFilter]);

  const availableLocations = useMemo(() => Array.from(new Set(records.map((record) => record.locationName))).sort(), [records]);
  const availableViolations = useMemo(() => Array.from(new Set(records.map((record) => record.violationLabel))).sort(), [records]);

  const plateGroups = useMemo(() => {
    const groups = new Map<string, StatisticsRecord[]>();

    for (const record of filteredRecords) {
      const key = `${record.plateState}-${record.plateNumber}`;
      const existing = groups.get(key);

      if (existing) {
        existing.push(record);
      } else {
        groups.set(key, [record]);
      }
    }

    return groups;
  }, [filteredRecords]);

  const repeatPlateCount = Array.from(plateGroups.values()).filter((group) => group.length > 1).length;
  const totalPlateCount = plateGroups.size || 1;
  const repeatRate = Math.round((repeatPlateCount / totalPlateCount) * 100);

  const locationSlices = useMemo(() => {
    const counts = new Map<string, number>();

    for (const record of filteredRecords) {
      counts.set(record.locationName, (counts.get(record.locationName) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([label, value], index) => ({
        key: label,
        label,
        value,
        color: locationColors[index % locationColors.length]
      }));
  }, [filteredRecords]);

  const totalFineAmount = useMemo(
    () => filteredRecords.reduce((sum, record) => sum + Number(record.recordType === "citation" ? record.fineAmount ?? 0 : 0), 0),
    [filteredRecords]
  );

  const selectedLocationName = selectedLocation ?? locationSlices[0]?.key ?? null;
  const locationRecords = useMemo(
    () => filteredRecords.filter((record) => !selectedLocationName || record.locationName === selectedLocationName),
    [filteredRecords, selectedLocationName]
  );

  const locationViolationCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const record of locationRecords) {
      counts.set(record.violationLabel, (counts.get(record.violationLabel) ?? 0) + 1);
    }

    const max = Math.max(...counts.values(), 1);

    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value, width: `${Math.max(18, Math.round((value / max) * 100))}%` }));
  }, [locationRecords]);

  const locationRepeatRate = useMemo(() => {
    const groups = new Map<string, number>();

    for (const record of locationRecords) {
      const key = `${record.plateState}-${record.plateNumber}`;
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }

    const total = groups.size || 1;
    const repeat = Array.from(groups.values()).filter((count) => count > 1).length;
    return Math.round((repeat / total) * 100);
  }, [locationRecords]);

  const vehicleFineLeaders = useMemo(() => {
    const totals = new Map<string, { label: string; amount: number; citations: number }>();

    for (const record of filteredRecords) {
      const amount = Number((record as { fineAmount?: string }).fineAmount ?? 0);
      const key = `${record.plateState}-${record.plateNumber}`;
      const existing = totals.get(key) ?? {
        label: `${record.plateState} ${record.plateNumber}`,
        amount: 0,
        citations: 0
      };

      existing.amount += amount;
      if (record.recordType === "citation") {
        existing.citations += 1;
      }

      totals.set(key, existing);
    }

    return Array.from(totals.values())
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 6);
  }, [filteredRecords]);

  const locationRevenue = useMemo(() => {
    const totals = new Map<string, number>();

    for (const record of filteredRecords) {
      totals.set(record.locationName, (totals.get(record.locationName) ?? 0) + Number(record.fineAmount ?? 0));
    }

    return Array.from(totals.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6);
  }, [filteredRecords]);

  const topViolationRevenue = useMemo(() => {
    const totals = new Map<string, number>();

    for (const record of filteredRecords) {
      totals.set(record.violationLabel, (totals.get(record.violationLabel) ?? 0) + Number(record.fineAmount ?? 0));
    }

    return Array.from(totals.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5);
  }, [filteredRecords]);

  return (
    <div className="grid">
      <div className="page-head">
        <h2>Statistics</h2>
      </div>

      <section className="panel grid">
        <div className="history-filter-grid">
          <label className="field">
            <span>Range</span>
            <select value={rangePreset} onChange={(event) => setRangePreset(event.target.value as "all" | "7" | "30" | "90" | "custom")}>
              <option value="all">All Time</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          {rangePreset === "custom" ? (
            <>
              <label className="field">
                <span>Start Date</span>
                <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} />
              </label>
              <label className="field">
                <span>End Date</span>
                <input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} />
              </label>
            </>
          ) : null}
          <label className="field">
            <span>Location</span>
            <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
              <option value="all">All</option>
              {availableLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Violation</span>
            <select value={violationFilter} onChange={(event) => setViolationFilter(event.target.value)}>
              <option value="all">All</option>
              {availableViolations.map((violation) => (
                <option key={violation} value={violation}>
                  {violation}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid stats">
        <article className="stat-card">
          <span className="muted">Total Records</span>
          <strong>{filteredRecords.length}</strong>
        </article>
        <article className="stat-card">
          <span className="muted">Repeat Offender Rate</span>
          <strong>{repeatRate}%</strong>
        </article>
        <article className="stat-card">
          <span className="muted">Repeat Vehicles</span>
          <strong>{repeatPlateCount}</strong>
        </article>
        <article className="stat-card">
          <span className="muted">Total Fine Revenue</span>
          <strong className="stat-small">${Math.round(totalFineAmount)}</strong>
        </article>
      </section>

      <div className="statistics-grid">
        <PieChart title="Tickets By Location" slices={locationSlices} legendLimit={3} selectedKey={selectedLocationName ?? undefined} onSelect={setSelectedLocation} />
        <section className="panel grid">
          <h3>Vehicles With Most Fines</h3>
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Citations</th>
                <th>Total Fines</th>
              </tr>
            </thead>
            <tbody>
              {vehicleFineLeaders.map((vehicle) => (
                <tr key={vehicle.label}>
                  <td>{vehicle.label}</td>
                  <td>{vehicle.citations}</td>
                  <td>${Math.round(vehicle.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <div className="statistics-grid">
        <section className="panel grid">
          <div className="page-head" style={{ marginBottom: 0 }}>
            <h3>{selectedLocationName ? `${selectedLocationName} Breakdown` : "Location Breakdown"}</h3>
          </div>
          <div className="grid stats">
            <article className="stat-card">
              <span className="muted">Records In Lot</span>
              <strong>{locationRecords.length}</strong>
            </article>
            <article className="stat-card">
              <span className="muted">Repeat Offender Rate</span>
              <strong>{locationRepeatRate}%</strong>
            </article>
            <article className="stat-card">
              <span className="muted">Most Recent Record</span>
              <strong className="stat-small">{locationRecords[0] ? new Date(locationRecords[0].occurredAt).toLocaleDateString() : "N/A"}</strong>
            </article>
          </div>
          <div className="grid">
            <h3>Top Violations In This Lot</h3>
            {locationViolationCounts.map((item) => (
              <div key={item.label} className="bar-row">
                <span>{item.label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: item.width }} />
                </div>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel grid">
          <h3>Revenue By Lot</h3>
          <table>
            <thead>
              <tr>
                <th>Lot</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {locationRevenue.map(([location, total]) => (
                <tr key={location}>
                  <td>{location}</td>
                  <td>${Math.round(total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel grid">
          <h3>Top 5 Violation Revenue</h3>
          <div className="notice">Total from top 5 violations: ${Math.round(topViolationRevenue.reduce((sum, [, amount]) => sum + amount, 0))}</div>
          <table>
            <thead>
              <tr>
                <th>Violation</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topViolationRevenue.map(([violation, amount]) => (
                <tr key={violation}>
                  <td>{violation}</td>
                  <td>${Math.round(amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
