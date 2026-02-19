/**
 * PIREP Submission Service
 *
 * Allows pilots to submit pilot reports from within the app.
 * Stores PIREPs in Firestore for community sharing.
 */

import {
  FIRESTORE_API_URL,
  jsToFirestoreValue,
} from "./firebase";

export type TurbulenceIntensity = "NEG" | "LGT" | "LGT-MOD" | "MOD" | "MOD-SEV" | "SEV" | "EXTRM";
export type IcingIntensity = "NEG" | "TRC" | "LGT" | "MOD" | "SEV";
export type SkyCondition = "CLR" | "FEW" | "SCT" | "BKN" | "OVC";

export interface PirepSubmission {
  // Location
  nearestStation: string; // ICAO
  latitude?: number;
  longitude?: number;

  // Flight info
  altitude: number; // MSL feet
  aircraftType: string;

  // Conditions
  turbulence?: TurbulenceIntensity;
  icing?: IcingIntensity;
  skyCondition?: SkyCondition;
  cloudBase?: number;
  cloudTop?: number;
  flightVisibility?: number; // SM
  temperature?: number; // Celsius
  windDirection?: number;
  windSpeed?: number;

  // Free text
  remarks?: string;
}

export interface SubmittedPirep extends PirepSubmission {
  id: string;
  submittedBy: string;
  submittedAt: string; // ISO
  upvotes: number;
}

/**
 * Format a PIREP submission into standard PIREP text format
 */
export function formatPirepText(pirep: PirepSubmission): string {
  const parts: string[] = [
    "UA",
    `/OV ${pirep.nearestStation}`,
    `/TM ${new Date().toISOString().slice(11, 16).replace(":", "")}`,
    `/FL${Math.round(pirep.altitude / 100).toString().padStart(3, "0")}`,
    `/TP ${pirep.aircraftType}`,
  ];

  if (pirep.skyCondition) {
    let sky = pirep.skyCondition;
    if (pirep.cloudBase) sky += ` ${Math.round(pirep.cloudBase / 100).toString().padStart(3, "0")}`;
    if (pirep.cloudTop) sky += `-TOP ${Math.round(pirep.cloudTop / 100).toString().padStart(3, "0")}`;
    parts.push(`/SK ${sky}`);
  }

  if (pirep.flightVisibility != null) {
    parts.push(`/WX FV${String(pirep.flightVisibility).padStart(2, "0")}SM`);
  }

  if (pirep.temperature != null) {
    const sign = pirep.temperature < 0 ? "M" : "";
    parts.push(`/TA ${sign}${Math.abs(pirep.temperature)}`);
  }

  if (pirep.windDirection != null && pirep.windSpeed != null) {
    parts.push(`/WV ${pirep.windDirection.toString().padStart(3, "0")}${pirep.windSpeed.toString().padStart(2, "0")}KT`);
  }

  if (pirep.turbulence && pirep.turbulence !== "NEG") {
    parts.push(`/TB ${pirep.turbulence}`);
  }

  if (pirep.icing && pirep.icing !== "NEG") {
    parts.push(`/IC ${pirep.icing}`);
  }

  if (pirep.remarks) {
    parts.push(`/RM ${pirep.remarks}`);
  }

  return parts.join(" ");
}

/**
 * Submit a PIREP to Firestore community database
 */
export async function submitPirep(
  pirep: PirepSubmission,
  userId: string
): Promise<string | null> {
  if (!FIRESTORE_API_URL) return null;

  try {
    const url = `${FIRESTORE_API_URL}/pireps`;
    const fields: Record<string, any> = {
      nearestStation: jsToFirestoreValue(pirep.nearestStation),
      altitude: jsToFirestoreValue(pirep.altitude),
      aircraftType: jsToFirestoreValue(pirep.aircraftType),
      turbulence: jsToFirestoreValue(pirep.turbulence ?? null),
      icing: jsToFirestoreValue(pirep.icing ?? null),
      skyCondition: jsToFirestoreValue(pirep.skyCondition ?? null),
      cloudBase: jsToFirestoreValue(pirep.cloudBase ?? null),
      cloudTop: jsToFirestoreValue(pirep.cloudTop ?? null),
      flightVisibility: jsToFirestoreValue(pirep.flightVisibility ?? null),
      temperature: jsToFirestoreValue(pirep.temperature ?? null),
      windDirection: jsToFirestoreValue(pirep.windDirection ?? null),
      windSpeed: jsToFirestoreValue(pirep.windSpeed ?? null),
      remarks: jsToFirestoreValue(pirep.remarks ?? null),
      rawText: jsToFirestoreValue(formatPirepText(pirep)),
      submittedBy: jsToFirestoreValue(userId),
      submittedAt: jsToFirestoreValue(new Date().toISOString()),
      upvotes: jsToFirestoreValue(0),
    };

    if (pirep.latitude != null && pirep.longitude != null) {
      fields.latitude = jsToFirestoreValue(pirep.latitude);
      fields.longitude = jsToFirestoreValue(pirep.longitude);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.name?.split("/").pop() ?? null;
  } catch (error) {
    console.error("[PIREP] Failed to submit:", error);
    return null;
  }
}

/**
 * Turbulence labels for UI display
 */
export const TURBULENCE_OPTIONS: Array<{ value: TurbulenceIntensity; label: string; description: string }> = [
  { value: "NEG", label: "None", description: "Smooth ride" },
  { value: "LGT", label: "Light", description: "Slight, erratic changes in attitude/altitude" },
  { value: "LGT-MOD", label: "Light-Moderate", description: "Similar to light but greater intensity" },
  { value: "MOD", label: "Moderate", description: "Changes in attitude/altitude, variations in airspeed" },
  { value: "MOD-SEV", label: "Moderate-Severe", description: "Similar to moderate but greater intensity" },
  { value: "SEV", label: "Severe", description: "Large, abrupt changes. Aircraft may be momentarily out of control" },
  { value: "EXTRM", label: "Extreme", description: "Aircraft practically impossible to control" },
];

/**
 * Icing labels for UI display
 */
export const ICING_OPTIONS: Array<{ value: IcingIntensity; label: string; description: string }> = [
  { value: "NEG", label: "None", description: "No icing" },
  { value: "TRC", label: "Trace", description: "Barely perceptible, not hazardous" },
  { value: "LGT", label: "Light", description: "Rate of accumulation may be a problem over 1+ hour" },
  { value: "MOD", label: "Moderate", description: "Rate of accumulation requires diversion" },
  { value: "SEV", label: "Severe", description: "Rate of accumulation requires immediate diversion" },
];
