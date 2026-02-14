import type { FlightCategory } from "@/lib/api/types";

interface StationBriefing {
  icao: string;
  name: string;
  flightCategory: FlightCategory;
  temperature: number;
  dewpoint: number;
  wind: string;
  visibility: string;
  ceiling: string;
  altimeter: string;
  rawMetar: string;
}

const categoryColors: Record<FlightCategory, string> = {
  VFR: "#22c55e",
  MVFR: "#3b82f6",
  IFR: "#ef4444",
  LIFR: "#d946ef",
};

function stationCard(station: StationBriefing): string {
  const catColor = categoryColors[station.flightCategory];
  return `
    <div style="background: rgba(255,255,255,0.8); backdrop-filter: blur(8px); border-radius: 16px; padding: 20px; margin-bottom: 16px; border: 1px solid rgba(12,140,233,0.1); box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div>
          <h2 style="margin: 0; font-size: 20px; color: #083f6e; font-weight: 700;">${station.icao}</h2>
          <p style="margin: 2px 0 0; font-size: 12px; color: #7cc4ff;">${station.name}</p>
        </div>
        <span style="display: inline-block; padding: 4px 12px; border-radius: 999px; background: ${catColor}; color: white; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">
          ${station.flightCategory}
        </span>
      </div>
      <table style="width: 100%; font-size: 13px; color: #083f6e;">
        <tr>
          <td style="padding: 4px 0; color: #7cc4ff;">Wind</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600;">${station.wind}</td>
          <td style="padding: 4px 0 4px 16px; color: #7cc4ff;">Visibility</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600;">${station.visibility}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #7cc4ff;">Ceiling</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600;">${station.ceiling}</td>
          <td style="padding: 4px 0 4px 16px; color: #7cc4ff;">Altimeter</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600;">${station.altimeter}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #7cc4ff;">Temp/Dewpt</td>
          <td colspan="3" style="padding: 4px 0; text-align: right; font-weight: 600;">${station.temperature}°C / ${station.dewpoint}°C</td>
        </tr>
      </table>
      <div style="margin-top: 12px; padding: 8px 12px; background: #f0f7ff; border-radius: 8px; font-size: 11px; font-family: monospace; color: #083f6e; word-break: break-all;">
        ${station.rawMetar}
      </div>
    </div>
  `;
}

export function buildDailyBriefHTML(stations: StationBriefing[]): string {
  const date = new Date().toUTCString().replace("GMT", "Z");
  const stationCards = stations.map(stationCard).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SkyBrief Daily Briefing</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="background: linear-gradient(to bottom, #1e90ff, #87ceeb, #e0efff); min-height: 100%; padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: white; font-size: 28px; font-weight: 700; margin: 0; text-shadow: 0 2px 8px rgba(0,0,0,0.15);">
          SkyBrief
        </h1>
        <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 8px 0 0;">
          Your daily preflight weather briefing
        </p>
        <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 4px 0 0;">
          ${date}
        </p>
      </div>

      <!-- Station Cards -->
      ${stationCards}

      <!-- Footer -->
      <div style="text-align: center; padding: 24px 0;">
        <p style="color: rgba(255,255,255,0.5); font-size: 10px; margin: 0;">
          This briefing is for informational purposes only. Always verify weather data through official sources before flight.
        </p>
        <p style="color: rgba(255,255,255,0.4); font-size: 10px; margin: 8px 0 0;">
          SkyBrief &mdash; AI-powered preflight weather briefing
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export type { StationBriefing };
