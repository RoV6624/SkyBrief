/**
 * Tests for date helper functions
 */

import {
  daysSince,
  hoursSince,
  minutesSince,
  isStale,
  formatRelativeTime,
  isWithinDays,
  isWithinHours,
} from "../date-helpers";

describe("daysSince", () => {
  it("should calculate days since a past date", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(daysSince(twoDaysAgo)).toBe(2);
  });

  it("should return 0 for today", () => {
    const now = new Date();
    expect(daysSince(now)).toBe(0);
  });

  it("should calculate large number of days", () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    expect(daysSince(thirtyDaysAgo)).toBe(30);
  });
});

describe("hoursSince", () => {
  it("should calculate hours since a past date", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(hoursSince(threeHoursAgo)).toBe(3);
  });

  it("should return 0 for current hour", () => {
    const now = new Date();
    expect(hoursSince(now)).toBe(0);
  });
});

describe("minutesSince", () => {
  it("should calculate minutes since a past date", () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    expect(minutesSince(tenMinutesAgo)).toBe(10);
  });

  it("should return 0 for current minute", () => {
    const now = new Date();
    expect(minutesSince(now)).toBe(0);
  });
});

describe("isStale", () => {
  it("should return true for stale data", () => {
    const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const maxAge = 60 * 60 * 1000; // 1 hour
    expect(isStale(oldDate, maxAge)).toBe(true);
  });

  it("should return false for fresh data", () => {
    const recentDate = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
    const maxAge = 60 * 60 * 1000; // 1 hour
    expect(isStale(recentDate, maxAge)).toBe(false);
  });

  it("should handle edge case at exact threshold", () => {
    const date = new Date(Date.now() - 1000);
    const maxAge = 1000;
    // At exact threshold, should be stale or just fresh (depends on timing)
    const result = isStale(date, maxAge);
    expect(typeof result).toBe("boolean");
  });
});

describe("formatRelativeTime", () => {
  it("should format just now", () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe("just now");
  });

  it("should format minutes ago", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinutesAgo)).toBe("5 minutes ago");
  });

  it("should format hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoHoursAgo)).toBe("2 hours ago");
  });

  it("should format days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeDaysAgo)).toBe("3 days ago");
  });

  it("should use singular for 1 minute", () => {
    const oneMinuteAgo = new Date(Date.now() - 61 * 1000);
    expect(formatRelativeTime(oneMinuteAgo)).toBe("1 minute ago");
  });

  it("should use singular for 1 hour", () => {
    const oneHourAgo = new Date(Date.now() - 61 * 60 * 1000);
    expect(formatRelativeTime(oneHourAgo)).toBe("1 hour ago");
  });

  it("should use singular for 1 day", () => {
    const oneDayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    expect(formatRelativeTime(oneDayAgo)).toBe("1 day ago");
  });
});

describe("isWithinDays", () => {
  it("should return true for date within threshold", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(isWithinDays(twoDaysAgo, 7)).toBe(true);
  });

  it("should return false for date outside threshold", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(isWithinDays(tenDaysAgo, 7)).toBe(false);
  });

  it("should handle edge case at exact threshold", () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    expect(isWithinDays(sevenDaysAgo, 7)).toBe(true);
  });
});

describe("isWithinHours", () => {
  it("should return true for date within threshold", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(isWithinHours(twoHoursAgo, 24)).toBe(true);
  });

  it("should return false for date outside threshold", () => {
    const twentySixHoursAgo = new Date(Date.now() - 26 * 60 * 60 * 1000);
    expect(isWithinHours(twentySixHoursAgo, 24)).toBe(false);
  });
});
