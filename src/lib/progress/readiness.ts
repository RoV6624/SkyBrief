/**
 * Stage Check Readiness Calculator
 *
 * Evaluates student readiness for stage checks and checkrides
 * based on accumulated briefing data, FRAT trends, and compliance.
 */

import type { StudentMetrics } from "@/services/tenant-api";

export type ReadinessLevel = "ready" | "nearly_ready" | "needs_work" | "insufficient_data";

export interface ReadinessCategory {
  id: string;
  label: string;
  score: number; // 0-100
  status: "pass" | "marginal" | "fail";
  detail: string;
}

export interface ReadinessResult {
  overallLevel: ReadinessLevel;
  overallScore: number; // 0-100
  categories: ReadinessCategory[];
  summary: string;
  recommendations: string[];
}

interface ReadinessConfig {
  minBriefings: number;
  minApprovalRate: number; // 0-1
  maxAvgFrat: number;
  maxMinimumsBreaches: number;
  requiredFlightTypes?: string[];
}

const DEFAULT_CONFIG: ReadinessConfig = {
  minBriefings: 10,
  minApprovalRate: 0.75,
  maxAvgFrat: 25,
  maxMinimumsBreaches: 2,
  requiredFlightTypes: ["local", "xc"],
};

/**
 * Calculate stage check readiness from student metrics
 */
export function calculateReadiness(
  metrics: StudentMetrics,
  config: ReadinessConfig = DEFAULT_CONFIG
): ReadinessResult {
  const categories: ReadinessCategory[] = [];
  const recommendations: string[] = [];

  // 1. Briefing Volume
  const volumeRatio = Math.min(metrics.totalBriefings / config.minBriefings, 1);
  const volumeScore = Math.round(volumeRatio * 100);
  categories.push({
    id: "volume",
    label: "Briefing Volume",
    score: volumeScore,
    status: volumeScore >= 80 ? "pass" : volumeScore >= 50 ? "marginal" : "fail",
    detail: `${metrics.totalBriefings}/${config.minBriefings} required briefings completed`,
  });
  if (volumeScore < 80) {
    recommendations.push(
      `Complete ${config.minBriefings - metrics.totalBriefings} more briefings`
    );
  }

  // 2. Approval Rate
  const approvalRate =
    metrics.totalBriefings > 0
      ? metrics.approvedFirstTry / metrics.totalBriefings
      : 0;
  const approvalScore = Math.round(Math.min(approvalRate / config.minApprovalRate, 1) * 100);
  categories.push({
    id: "approval",
    label: "CFI Approval Rate",
    score: approvalScore,
    status: approvalScore >= 80 ? "pass" : approvalScore >= 50 ? "marginal" : "fail",
    detail: `${Math.round(approvalRate * 100)}% first-try approval (target: ${Math.round(config.minApprovalRate * 100)}%)`,
  });
  if (approvalScore < 80) {
    recommendations.push("Focus on completing all checklist items before submitting");
  }

  // 3. Risk Assessment Quality
  const fratScore = metrics.avgFratScore;
  const fratRatio = fratScore <= config.maxAvgFrat
    ? 1
    : Math.max(0, 1 - (fratScore - config.maxAvgFrat) / 30);
  const fratScoreValue = Math.round(fratRatio * 100);
  categories.push({
    id: "risk",
    label: "Risk Assessment",
    score: fratScoreValue,
    status: fratScoreValue >= 80 ? "pass" : fratScoreValue >= 50 ? "marginal" : "fail",
    detail: `Avg FRAT score: ${fratScore.toFixed(1)} (target: <${config.maxAvgFrat})`,
  });
  if (fratScoreValue < 80) {
    recommendations.push("Improve risk assessment — review FRAT factors carefully");
  }

  // 4. Minimums Compliance
  const breachRatio = metrics.totalBriefings > 0
    ? metrics.minimumsBreaches / metrics.totalBriefings
    : 0;
  const complianceScore = Math.round(Math.max(0, 1 - breachRatio * 5) * 100);
  categories.push({
    id: "compliance",
    label: "Minimums Compliance",
    score: complianceScore,
    status: complianceScore >= 80 ? "pass" : complianceScore >= 50 ? "marginal" : "fail",
    detail: `${metrics.minimumsBreaches} minimums breach${metrics.minimumsBreaches !== 1 ? "es" : ""} recorded`,
  });
  if (complianceScore < 80) {
    recommendations.push("Review personal minimums and avoid flying in conditions beyond limits");
  }

  // 5. Flight Type Diversity
  if (config.requiredFlightTypes && config.requiredFlightTypes.length > 0) {
    const completedTypes = config.requiredFlightTypes.filter(
      (type) => (metrics.briefingsByType[type] ?? 0) >= 1
    );
    const diversityScore = Math.round(
      (completedTypes.length / config.requiredFlightTypes.length) * 100
    );
    categories.push({
      id: "diversity",
      label: "Flight Type Coverage",
      score: diversityScore,
      status: diversityScore >= 80 ? "pass" : diversityScore >= 50 ? "marginal" : "fail",
      detail: `${completedTypes.length}/${config.requiredFlightTypes.length} required types completed`,
    });
    const missing = config.requiredFlightTypes.filter(
      (type) => !completedTypes.includes(type)
    );
    if (missing.length > 0) {
      recommendations.push(`Complete briefings for: ${missing.join(", ")} flights`);
    }
  }

  // Calculate overall
  const overallScore = Math.round(
    categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length
  );

  let overallLevel: ReadinessLevel;
  if (metrics.totalBriefings < 3) {
    overallLevel = "insufficient_data";
  } else if (overallScore >= 80 && categories.every((c) => c.status !== "fail")) {
    overallLevel = "ready";
  } else if (overallScore >= 60) {
    overallLevel = "nearly_ready";
  } else {
    overallLevel = "needs_work";
  }

  const summary = getSummaryText(overallLevel, overallScore, metrics);

  return {
    overallLevel,
    overallScore,
    categories,
    summary,
    recommendations,
  };
}

function getSummaryText(
  level: ReadinessLevel,
  score: number,
  metrics: StudentMetrics
): string {
  switch (level) {
    case "ready":
      return `${metrics.studentName} has completed ${metrics.totalBriefings} briefings with strong performance across all categories. Ready for stage check evaluation.`;
    case "nearly_ready":
      return `${metrics.studentName} is showing good progress with ${metrics.totalBriefings} briefings. A few areas need improvement before stage check.`;
    case "needs_work":
      return `${metrics.studentName} needs additional work before stage check. Review the recommendations below.`;
    case "insufficient_data":
      return `Not enough briefing data to assess readiness. ${metrics.studentName} needs at least 3 briefings for evaluation.`;
  }
}
