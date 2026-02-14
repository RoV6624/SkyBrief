/**
 * Date and time utility functions
 *
 * Common date calculations used throughout the aviation app.
 */

/**
 * Calculate the number of days since a given date
 * @param date - The date to calculate from
 * @returns Number of days (rounded down)
 */
export function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate the number of hours since a given date
 * @param date - The date to calculate from
 * @returns Number of hours (rounded down)
 */
export function hoursSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
}

/**
 * Calculate the number of minutes since a given date
 * @param date - The date to calculate from
 * @returns Number of minutes (rounded down)
 */
export function minutesSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60));
}

/**
 * Check if a date is stale based on a maximum age threshold
 * @param date - The date to check
 * @param maxAgeMs - Maximum age in milliseconds
 * @returns true if the date is older than the threshold
 */
export function isStale(date: Date, maxAgeMs: number): boolean {
  return Date.now() - date.getTime() > maxAgeMs;
}

/**
 * Format a date as a relative time string (e.g., "2 hours ago", "3 days ago")
 * @param date - The date to format
 * @returns Formatted relative time string
 */
export function formatRelativeTime(date: Date): string {
  const minutes = minutesSince(date);
  const hours = hoursSince(date);
  const days = daysSince(date);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;

  const years = Math.floor(days / 365);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

/**
 * Check if a date is within the last N days
 * @param date - The date to check
 * @param days - Number of days to check against
 * @returns true if the date is within the last N days
 */
export function isWithinDays(date: Date, days: number): boolean {
  return daysSince(date) <= days;
}

/**
 * Check if a date is within the last N hours
 * @param date - The date to check
 * @param hours - Number of hours to check against
 * @returns true if the date is within the last N hours
 */
export function isWithinHours(date: Date, hours: number): boolean {
  return hoursSince(date) <= hours;
}
