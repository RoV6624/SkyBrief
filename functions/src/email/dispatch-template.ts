/**
 * HTML email template for dispatch reports (FRAT + W&B).
 * Sent to school admin when a student submits a pre-flight dispatch.
 */

const COLORS = {
  background: "#0f172a",
  cardBg: "#1e293b",
  surface: "#334155",
  textPrimary: "#f8fafc",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  border: "#475569",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
} as const;

export interface DispatchEmailParams {
  schoolName: string;
  studentName: string;
  station: string;
  flightType: string;
  date: Date;
  fratScore: number;
  fratRiskLevel: "low" | "moderate" | "high" | "critical";
  fratItems?: Array<{ label: string; score: number }>;
  aircraft?: string;
  totalWeight?: number;
  cg?: number;
  withinLimits?: boolean;
  briefingSummary?: string;
}

function getRiskColor(level: string): string {
  switch (level) {
    case "low":
      return COLORS.green;
    case "moderate":
      return COLORS.amber;
    case "high":
      return COLORS.red;
    case "critical":
      return COLORS.red;
    default:
      return COLORS.textMuted;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function conditionRow(label: string, value: string, valueColor?: string): string {
  return `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};font-size:13px;color:${COLORS.textMuted};width:130px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};font-size:14px;color:${valueColor ?? COLORS.textPrimary};font-weight:500;">${escapeHtml(value)}</td>
  </tr>`;
}

export function buildDispatchEmailHtml(params: DispatchEmailParams): string {
  const {
    schoolName,
    studentName,
    station,
    flightType,
    date,
    fratScore,
    fratRiskLevel,
    fratItems,
    aircraft,
    totalWeight,
    cg,
    withinLimits,
    briefingSummary,
  } = params;

  const riskColor = getRiskColor(fratRiskLevel);
  const dateStr = formatDate(date);
  const limitsColor = withinLimits ? COLORS.green : COLORS.red;
  const limitsText = withinLimits ? "WITHIN LIMITS" : "EXCEEDS LIMITS";

  // Build FRAT items rows
  const fratItemsHtml = fratItems
    ? fratItems
        .map(
          (item) =>
            conditionRow(item.label, String(item.score))
        )
        .join("")
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SkyBrief Dispatch Report</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${COLORS.textPrimary};-webkit-text-size-adjust:100%;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${COLORS.background};">
  <tr>
    <td align="center" style="padding:24px 16px;">

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${COLORS.cardBg};border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${COLORS.background} 0%,${COLORS.cardBg} 100%);padding:32px 32px 24px 32px;border-bottom:1px solid ${COLORS.border};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td>
                  <span style="font-size:14px;color:${COLORS.textSecondary};letter-spacing:1px;text-transform:uppercase;">SkyBrief Dispatch Report</span>
                </td>
                <td align="right">
                  <span style="font-size:13px;color:${COLORS.textMuted};">${escapeHtml(dateStr)}</span>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:8px;">
                  <span style="font-size:18px;font-weight:700;color:${COLORS.textPrimary};">${escapeHtml(schoolName)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Student Info -->
        <tr>
          <td style="padding:24px 32px 16px 32px;">
            <span style="font-size:11px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:2px;">Student Information</span>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;border-collapse:collapse;">
              ${conditionRow("Student", studentName)}
              ${conditionRow("Station", station)}
              ${conditionRow("Flight Type", flightType.toUpperCase())}
            </table>
          </td>
        </tr>

        <!-- FRAT Assessment -->
        <tr>
          <td style="padding:8px 32px 16px 32px;">
            <span style="font-size:11px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:2px;">FRAT Assessment</span>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;background-color:${riskColor}15;border:2px solid ${riskColor};border-radius:10px;">
              <tr>
                <td align="center" style="padding:20px;">
                  <span style="font-size:11px;color:${COLORS.textSecondary};text-transform:uppercase;letter-spacing:2px;">Risk Score</span><br>
                  <span style="font-size:36px;font-weight:700;color:${riskColor};">${fratScore}</span><br>
                  <span style="display:inline-block;margin-top:4px;background-color:${riskColor};color:#ffffff;font-size:12px;font-weight:700;padding:4px 14px;border-radius:12px;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(fratRiskLevel)}</span>
                </td>
              </tr>
            </table>
            ${
              fratItemsHtml
                ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;border-collapse:collapse;">
                    ${fratItemsHtml}
                   </table>`
                : ""
            }
          </td>
        </tr>

        <!-- Weight & Balance -->
        ${
          totalWeight != null
            ? `<tr>
          <td style="padding:8px 32px 16px 32px;">
            <span style="font-size:11px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:2px;">Weight &amp; Balance</span>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;border-collapse:collapse;">
              ${aircraft ? conditionRow("Aircraft", aircraft) : ""}
              ${conditionRow("Total Weight", `${totalWeight.toLocaleString()} lbs`)}
              ${cg != null ? conditionRow("CG", `${cg.toFixed(1)} in`) : ""}
              ${conditionRow("Status", limitsText, limitsColor)}
            </table>
          </td>
        </tr>`
            : ""
        }

        <!-- Briefing Summary -->
        ${
          briefingSummary
            ? `<tr>
          <td style="padding:8px 32px 20px 32px;">
            <span style="font-size:11px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:2px;">Briefing Summary</span>
            <p style="margin:8px 0 0 0;font-size:14px;color:${COLORS.textSecondary};line-height:1.6;">${escapeHtml(briefingSummary)}</p>
          </td>
        </tr>`
            : ""
        }

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${COLORS.border};background-color:${COLORS.background};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td align="center">
                  <p style="margin:0 0 8px 0;font-size:12px;color:${COLORS.textMuted};line-height:1.5;">
                    This dispatch report is generated by SkyBrief for record-keeping purposes.<br>
                    The instructor is responsible for reviewing all pre-flight dispatch submissions.
                  </p>
                  <p style="margin:0;font-size:11px;color:${COLORS.textMuted};">
                    SkyBrief &copy; ${date.getFullYear()}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`;
}
