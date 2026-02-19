import type { ServerMetar, ServerTaf } from "../weather/fetch-weather";
import type { BriefingSummary } from "../weather/briefing-engine";

interface EmailTemplateParams {
  station: string;
  pilotName: string;
  metar: ServerMetar;
  taf: ServerTaf | null;
  briefing: BriefingSummary;
  date: Date;
}

// ===== Color Constants =====

const COLORS = {
  vfr: "#22c55e",
  mvfr: "#3b82f6",
  ifr: "#ef4444",
  lifr: "#a855f7",
  background: "#0f172a",
  cardBg: "#1e293b",
  surface: "#334155",
  textPrimary: "#f8fafc",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  border: "#475569",
  goGreen: "#22c55e",
  marginalAmber: "#f59e0b",
  nogoRed: "#ef4444",
} as const;

/**
 * Build a responsive HTML email for the daily weather briefing.
 *
 * Uses inline CSS throughout for maximum email client compatibility.
 * Tested layout patterns work across Gmail, Apple Mail, Outlook, and Yahoo Mail.
 */
export function buildEmailHtml(params: EmailTemplateParams): string {
  const { station, pilotName, metar, taf, briefing, date } = params;

  const categoryColor = getCategoryColor(metar.flightCategory);
  const goNoGoColor = getGoNoGoColor(briefing.goNoGo);
  const goNoGoLabel = getGoNoGoLabel(briefing.goNoGo);
  const dateStr = formatDate(date);
  const timeStr = formatTime(metar.observationTime);
  const windStr = formatWind(metar);
  const visStr = formatVisibility(metar.visibility);
  const ceilingStr = metar.ceiling !== null ? `${metar.ceiling.toLocaleString()} ft AGL` : "Clear";
  const tempStr = `${metar.temperature}°C / ${celsiusToFahrenheit(metar.temperature)}°F`;
  const dewpointStr = `${metar.dewpoint}°C / ${celsiusToFahrenheit(metar.dewpoint)}°F`;
  const altimeterStr = `${metar.altimeter.toFixed(2)} inHg`;
  const firstName = pilotName.split(" ")[0] || "Pilot";

  const hazardsHtml = buildHazardsSection(briefing.hazards);
  const tafHtml = buildTafSection(taf);
  const cloudsStr = formatClouds(metar.clouds);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>SkyBrief Daily Briefing - ${station}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${COLORS.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${COLORS.textPrimary};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Wrapper Table -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${COLORS.background};">
  <tr>
    <td align="center" style="padding:24px 16px;">

      <!-- Main Content Table -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${COLORS.cardBg};border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${COLORS.background} 0%,${COLORS.cardBg} 100%);padding:32px 32px 24px 32px;border-bottom:1px solid ${COLORS.border};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td>
                  <span style="font-size:14px;color:${COLORS.textSecondary};letter-spacing:1px;text-transform:uppercase;">SkyBrief Daily Briefing</span>
                </td>
                <td align="right">
                  <span style="font-size:13px;color:${COLORS.textMuted};">${dateStr}</span>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:12px;">
                  <span style="font-size:13px;color:${COLORS.textSecondary};">Good morning, ${escapeHtml(firstName)}.</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Station & Flight Category -->
        <tr>
          <td style="padding:24px 32px 16px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td>
                  <span style="font-size:32px;font-weight:700;color:${COLORS.textPrimary};letter-spacing:2px;font-family:'Courier New',monospace;">${escapeHtml(station)}</span>
                </td>
                <td align="right" valign="middle">
                  <span style="display:inline-block;background-color:${categoryColor};color:#ffffff;font-size:14px;font-weight:700;padding:6px 16px;border-radius:20px;letter-spacing:1px;">${escapeHtml(metar.flightCategory)}</span>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:4px;">
                  <span style="font-size:12px;color:${COLORS.textMuted};">Observed: ${escapeHtml(timeStr)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Raw METAR -->
        <tr>
          <td style="padding:0 32px 16px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${COLORS.surface};border-radius:8px;">
              <tr>
                <td style="padding:12px 16px;">
                  <span style="font-size:12px;font-family:'Courier New',monospace;color:${COLORS.textSecondary};word-break:break-all;line-height:1.5;">${escapeHtml(metar.rawText)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Go/No-Go Badge -->
        <tr>
          <td style="padding:0 32px 20px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${goNoGoColor}20;border:2px solid ${goNoGoColor};border-radius:10px;">
              <tr>
                <td align="center" style="padding:16px;">
                  <span style="font-size:11px;color:${COLORS.textSecondary};text-transform:uppercase;letter-spacing:2px;">Decision</span><br>
                  <span style="font-size:24px;font-weight:700;color:${goNoGoColor};letter-spacing:1px;">${goNoGoLabel}</span><br>
                  <span style="font-size:13px;color:${COLORS.textSecondary};margin-top:4px;display:inline-block;">${escapeHtml(briefing.recommendation)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Briefing Summary -->
        <tr>
          <td style="padding:0 32px 20px 32px;">
            <span style="font-size:11px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:2px;">Briefing Summary</span>
            <p style="margin:8px 0 0 0;font-size:14px;color:${COLORS.textSecondary};line-height:1.6;">${escapeHtml(briefing.summary)}</p>
          </td>
        </tr>

        <!-- Current Conditions Table -->
        <tr>
          <td style="padding:0 32px 20px 32px;">
            <span style="font-size:11px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:2px;">Current Conditions</span>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;border-collapse:collapse;">
              ${conditionRow("Wind", windStr)}
              ${conditionRow("Visibility", visStr)}
              ${conditionRow("Ceiling", ceilingStr)}
              ${conditionRow("Clouds", cloudsStr)}
              ${conditionRow("Temperature", tempStr)}
              ${conditionRow("Dewpoint", dewpointStr)}
              ${conditionRow("Altimeter", altimeterStr)}
              ${metar.presentWeather ? conditionRow("Weather", metar.presentWeather) : ""}
            </table>
          </td>
        </tr>

        <!-- Hazards Section -->
        ${hazardsHtml}

        <!-- TAF Section -->
        ${tafHtml}

        <!-- CTA Button -->
        <tr>
          <td style="padding:8px 32px 32px 32px;" align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background-color:${categoryColor};border-radius:8px;">
                  <a href="https://skybrief.app/briefing?station=${encodeURIComponent(station)}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.5px;">Open SkyBrief</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${COLORS.border};background-color:${COLORS.background};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td align="center">
                  <p style="margin:0 0 8px 0;font-size:12px;color:${COLORS.textMuted};line-height:1.5;">
                    This briefing is for informational purposes only and does not replace an official weather briefing.<br>
                    Always check NOTAMs and TFRs before flight. Pilot in command is responsible for all go/no-go decisions.
                  </p>
                  <p style="margin:0;font-size:11px;color:${COLORS.textMuted};">
                    <a href="https://skybrief.app/settings/notifications" style="color:${COLORS.textMuted};text-decoration:underline;">Manage email preferences</a>
                    &nbsp;&middot;&nbsp;
                    <a href="https://skybrief.app/unsubscribe" style="color:${COLORS.textMuted};text-decoration:underline;">Unsubscribe</a>
                  </p>
                  <p style="margin:8px 0 0 0;font-size:11px;color:${COLORS.textMuted};">
                    SkyBrief &copy; ${date.getFullYear()}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
      <!-- End Main Content Table -->

    </td>
  </tr>
</table>
<!-- End Wrapper Table -->

</body>
</html>`;
}

// ===== Section Builders =====

/**
 * Build a single row in the conditions table.
 */
function conditionRow(label: string, value: string): string {
  return `<tr>
                <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};font-size:13px;color:${COLORS.textMuted};width:110px;vertical-align:top;">${escapeHtml(label)}</td>
                <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};font-size:14px;color:${COLORS.textPrimary};font-weight:500;">${escapeHtml(value)}</td>
              </tr>`;
}

/**
 * Build the hazards section if there are any hazards to display.
 */
function buildHazardsSection(hazards: string[]): string {
  if (hazards.length === 0) return "";

  const hazardItems = hazards
    .map(
      (h) =>
        `<tr>
          <td style="padding:6px 0 6px 0;vertical-align:top;width:20px;">
            <span style="color:${COLORS.nogoRed};font-size:14px;">&#9888;</span>
          </td>
          <td style="padding:6px 0 6px 8px;font-size:13px;color:${COLORS.textSecondary};line-height:1.4;">
            ${escapeHtml(h)}
          </td>
        </tr>`
    )
    .join("");

  return `<tr>
          <td style="padding:0 32px 20px 32px;">
            <span style="font-size:11px;color:${COLORS.nogoRed};text-transform:uppercase;letter-spacing:2px;font-weight:600;">Hazards &amp; Advisories</span>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;background-color:${COLORS.nogoRed}10;border-radius:8px;padding:4px 12px;">
              ${hazardItems}
            </table>
          </td>
        </tr>`;
}

/**
 * Build the TAF forecast section showing the next 6 hours.
 */
function buildTafSection(taf: ServerTaf | null): string {
  if (!taf || taf.forecasts.length === 0) {
    return `<tr>
          <td style="padding:0 32px 20px 32px;">
            <span style="font-size:11px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:2px;">Forecast</span>
            <p style="margin:8px 0 0 0;font-size:13px;color:${COLORS.textMuted};">No TAF data available for this station.</p>
          </td>
        </tr>`;
  }

  // Show up to 6 forecast periods
  const now = Date.now();
  const sixHoursLater = now + 6 * 60 * 60 * 1000;
  const relevantForecasts = taf.forecasts
    .filter((f) => {
      const fromTime = new Date(f.timeFrom).getTime();
      return fromTime <= sixHoursLater;
    })
    .slice(0, 6);

  if (relevantForecasts.length === 0) {
    return `<tr>
          <td style="padding:0 32px 20px 32px;">
            <span style="font-size:11px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:2px;">Forecast (Next 6 Hours)</span>
            <p style="margin:8px 0 0 0;font-size:13px;color:${COLORS.textMuted};">No forecast periods within the next 6 hours.</p>
          </td>
        </tr>`;
  }

  const forecastRows = relevantForecasts
    .map((f) => {
      const catColor = getCategoryColor(f.flightCategory);
      const fromTime = formatTimeShort(f.timeFrom);
      const toTime = formatTimeShort(f.timeTo);
      const windStr =
        f.windSpeed === 0
          ? "Calm"
          : f.windGust
          ? `${f.windSpeed}G${f.windGust}kt`
          : `${f.windSpeed}kt`;
      const visStr = f.visibility >= 6 ? "6+ SM" : `${f.visibility} SM`;
      const ceilStr =
        f.ceiling !== null ? `${f.ceiling.toLocaleString()} ft` : "Clear";
      const wxStr = f.wxString ? ` | ${f.wxString}` : "";

      return `<tr>
                <td style="padding:8px 10px;border-bottom:1px solid ${COLORS.border};vertical-align:top;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${catColor};margin-right:6px;vertical-align:middle;"></span>
                  <span style="font-size:12px;color:${COLORS.textSecondary};font-family:'Courier New',monospace;">${fromTime}-${toTime}</span>
                </td>
                <td style="padding:8px 10px;border-bottom:1px solid ${COLORS.border};font-size:12px;color:${COLORS.textPrimary};">
                  ${escapeHtml(windStr)} | ${escapeHtml(visStr)} | ${escapeHtml(ceilStr)}${escapeHtml(wxStr)}
                </td>
              </tr>`;
    })
    .join("");

  // Raw TAF text
  const rawTafTruncated =
    taf.rawText.length > 500 ? taf.rawText.substring(0, 500) + "..." : taf.rawText;

  return `<tr>
          <td style="padding:0 32px 12px 32px;">
            <span style="font-size:11px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:2px;">Forecast (Next 6 Hours)</span>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;border-collapse:collapse;">
              ${forecastRows}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 20px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${COLORS.surface};border-radius:8px;">
              <tr>
                <td style="padding:10px 14px;">
                  <span style="font-size:10px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:1px;">Raw TAF</span><br>
                  <span style="font-size:11px;font-family:'Courier New',monospace;color:${COLORS.textSecondary};word-break:break-all;line-height:1.5;">${escapeHtml(rawTafTruncated)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
}

// ===== Formatting Helpers =====

function getCategoryColor(category: string): string {
  switch (category) {
    case "VFR":
      return COLORS.vfr;
    case "MVFR":
      return COLORS.mvfr;
    case "IFR":
      return COLORS.ifr;
    case "LIFR":
      return COLORS.lifr;
    default:
      return COLORS.textMuted;
  }
}

function getGoNoGoColor(goNoGo: string): string {
  switch (goNoGo) {
    case "go":
      return COLORS.goGreen;
    case "marginal":
      return COLORS.marginalAmber;
    case "nogo":
      return COLORS.nogoRed;
    default:
      return COLORS.textMuted;
  }
}

function getGoNoGoLabel(goNoGo: string): string {
  switch (goNoGo) {
    case "go":
      return "GO";
    case "marginal":
      return "MARGINAL";
    case "nogo":
      return "NO-GO";
    default:
      return goNoGo.toUpperCase();
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return `${d.getUTCHours().toString().padStart(2, "0")}${d.getUTCMinutes().toString().padStart(2, "0")}Z`;
  } catch {
    return isoString;
  }
}

function formatTimeShort(isoString: string): string {
  try {
    const d = new Date(isoString);
    return `${d.getUTCHours().toString().padStart(2, "0")}${d.getUTCMinutes().toString().padStart(2, "0")}Z`;
  } catch {
    return isoString;
  }
}

function formatWind(metar: ServerMetar): string {
  if (metar.windSpeed === 0) return "Calm";

  const dir =
    metar.windDirection === "VRB" || metar.windDirection === 0
      ? "VRB"
      : String(metar.windDirection).padStart(3, "0");

  let result = `${dir}° at ${metar.windSpeed} kts`;
  if (metar.windGust) {
    result += `, gusting ${metar.windGust} kts`;
  }
  return result;
}

function formatVisibility(vis: number): string {
  if (vis >= 10) return "10+ SM";
  return `${vis} SM`;
}

function formatClouds(clouds: Array<{ cover: string; base: number }>): string {
  if (clouds.length === 0) return "Clear";

  const coverLabels: Record<string, string> = {
    CLR: "Clear",
    FEW: "Few",
    SCT: "Scattered",
    BKN: "Broken",
    OVC: "Overcast",
  };

  return clouds
    .map((c) => {
      const label = coverLabels[c.cover] ?? c.cover;
      return `${label} at ${c.base.toLocaleString()} ft`;
    })
    .join(", ");
}

function celsiusToFahrenheit(c: number): number {
  return Math.round(c * 9 / 5 + 32);
}

/**
 * Escape HTML special characters to prevent XSS in email content.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
