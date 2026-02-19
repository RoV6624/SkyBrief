import { FlightLogEntry } from "@/stores/logbook-store";

/**
 * Export logbook entries to CSV format
 *
 * @param entries - Array of flight log entries
 * @returns CSV string with headers and data rows
 *
 * @example
 * ```ts
 * const entries = useLogbookStore.getState().entries;
 * const csv = exportLogbookCSV(entries);
 * // Write to file or share
 * ```
 */
export function exportLogbookCSV(entries: FlightLogEntry[]): string {
  const headers = [
    "Date",
    "Aircraft",
    "Departure",
    "Arrival",
    "Route",
    "Duration (hrs)",
    "Flight Type",
    "Weather",
    "Remarks",
    "FRAT Score",
  ];

  const rows = entries.map((entry) => {
    const duration = Math.round((entry.durationMinutes / 60) * 10) / 10;
    const fratScore = entry.fratScore !== undefined ? entry.fratScore : "";

    return [
      entry.date,
      entry.aircraft,
      entry.departure,
      entry.arrival,
      entry.route,
      duration.toString(),
      entry.flightType,
      entry.weatherConditions,
      entry.remarks,
      fratScore.toString(),
    ];
  });

  // Escape CSV values (wrap in quotes if contains comma, quote, or newline)
  const escapeCsvValue = (value: string): string => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvLines = [
    headers.join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ];

  return csvLines.join("\n");
}
