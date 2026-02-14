import type { FuelPriceFreshness, FuelPriceReport } from "@/lib/api/types";

/**
 * Determine freshness level of a fuel price report based on age
 *
 * @param reportedAt - Date when price was reported
 * @returns Freshness level
 */
export function determineFreshness(reportedAt: Date): FuelPriceFreshness {
  const ageMs = Date.now() - reportedAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours < 6) return "fresh"; // < 6 hours
  if (ageHours < 24) return "recent"; // < 1 day
  if (ageHours < 72) return "stale"; // < 3 days
  return "outdated"; // 3+ days
}

/**
 * Get color for freshness indicator
 *
 * @param freshness - Freshness level
 * @returns Tailwind/hex color
 */
export function getFreshnessColor(freshness: FuelPriceFreshness): string {
  switch (freshness) {
    case "fresh":
      return "#10b981"; // green-500
    case "recent":
      return "#3b82f6"; // blue-500
    case "stale":
      return "#f59e0b"; // amber-500
    case "outdated":
      return "#ef4444"; // red-500
  }
}

/**
 * Get human-readable time ago string
 *
 * @param date - Date to compare
 * @returns Human-readable string like "2 hours ago"
 */
export function getTimeAgo(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  const months = Math.floor(diffDays / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

/**
 * Calculate confidence score based on upvotes and flags
 *
 * @param report - Fuel price report
 * @returns Confidence level (0-1)
 */
export function calculateConfidence(report: FuelPriceReport): number {
  const netVotes = report.upvotes - report.flags * 2; // Flags count double
  const totalVotes = report.upvotes + report.flags;

  if (totalVotes === 0) return 0.5; // Neutral for no votes
  if (netVotes < 0) return Math.max(0, 0.5 + netVotes * 0.1); // Decrease if flagged
  return Math.min(1, 0.5 + netVotes * 0.1); // Increase if upvoted
}

/**
 * Sort fuel price reports by relevance (freshness + confidence)
 *
 * @param reports - Array of fuel price reports
 * @returns Sorted array (most relevant first)
 */
export function sortReportsByRelevance(reports: FuelPriceReport[]): FuelPriceReport[] {
  return [...reports].sort((a, b) => {
    // Calculate relevance score
    const scoreA = calculateRelevanceScore(a);
    const scoreB = calculateRelevanceScore(b);
    return scoreB - scoreA; // Descending order
  });
}

function calculateRelevanceScore(report: FuelPriceReport): number {
  const freshness = determineFreshness(report.reported_at);
  const confidence = calculateConfidence(report);

  // Weight freshness more heavily
  const freshnessScore = {
    fresh: 1.0,
    recent: 0.7,
    stale: 0.4,
    outdated: 0.1,
  }[freshness];

  return freshnessScore * 0.7 + confidence * 0.3;
}

/**
 * Check if user has already upvoted a report
 *
 * @param report - Fuel price report
 * @param uid - User ID
 * @returns True if user has upvoted
 */
export function hasUserUpvoted(report: FuelPriceReport, uid: string): boolean {
  return report.verified_by_uids.includes(uid);
}

/**
 * Check if user has already flagged a report
 *
 * @param report - Fuel price report
 * @param uid - User ID
 * @returns True if user has flagged
 */
export function hasUserFlagged(report: FuelPriceReport, uid: string): boolean {
  return report.flagged_by_uids.includes(uid);
}
