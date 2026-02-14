import { getSunTimes } from "@/lib/solar/sun-position";
import type { PersonalMinimums } from "./types";

/**
 * Determines if a departure time qualifies as "night" for VFR purposes.
 * Night = after evening civil twilight end OR before morning civil twilight start.
 * Per 14 CFR 91.157, night VFR requires ceiling >= 1000ft and visibility >= 3SM,
 * but conservative practice (and many flight schools) use ceiling >= 1500ft, visibility >= 5SM.
 */
export function isNightVfr(
  lat: number,
  lon: number,
  departureTime?: Date
): boolean {
  const checkTime = departureTime ?? new Date();
  const sunTimes = getSunTimes(lat, lon, checkTime);

  // Check if time is before morning civil twilight or after evening civil twilight
  return (
    checkTime < sunTimes.civilTwilightStart ||
    checkTime > sunTimes.civilTwilightEnd
  );
}

/**
 * Returns tightened minimums for night VFR operations.
 * Per conservative 14 CFR 91.157 interpretation:
 * - Ceiling >= 1500ft AGL
 * - Visibility >= 5 SM
 */
export function getNightMinimums(
  base: PersonalMinimums
): PersonalMinimums {
  return {
    ...base,
    ceiling: Math.max(base.ceiling, 1500),
    visibility: Math.max(base.visibility, 5),
  };
}

/**
 * Get timezone abbreviation for a given date (e.g., "CST", "PST", "EST")
 */
function getTimezoneAbbr(date: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'short'
    });

    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(part => part.type === 'timeZoneName');
    return tzPart?.value || '';
  } catch (error) {
    // Fallback if Intl API fails
    return '';
  }
}

/**
 * Returns formatted sunrise/sunset info including currency night markers for display.
 * - logbookNight: evening civil twilight end (sun 6° below horizon) — when pilots log "night"
 * - currencyNight: sunset + 60 min — when landings count for FAA 90-day passenger currency
 */
export function getSunInfo(
  lat: number,
  lon: number,
  date?: Date
): {
  isNight: boolean;
  sunrise: string;
  sunset: string;
  civilTwilightEnd: string;
  logbookNight: string;
  currencyNight: string;
  sunriseDate: Date;
  sunsetDate: Date;
  civilTwilightStartDate: Date;
  civilTwilightEndDate: Date;
  currencyNightDate: Date;
} {
  const checkDate = date ?? new Date();
  const sunTimes = getSunTimes(lat, lon, checkDate);

  const format = (d: Date) => {
    const time = `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
    const tz = getTimezoneAbbr(d);
    return tz ? `${time} ${tz}` : time;
  };

  const currencyNightDate = new Date(sunTimes.sunset.getTime() + 60 * 60 * 1000);

  return {
    isNight:
      checkDate < sunTimes.civilTwilightStart ||
      checkDate > sunTimes.civilTwilightEnd,
    sunrise: format(sunTimes.sunrise),
    sunset: format(sunTimes.sunset),
    civilTwilightEnd: format(sunTimes.civilTwilightEnd),
    logbookNight: format(sunTimes.civilTwilightEnd),
    currencyNight: format(currencyNightDate),
    sunriseDate: sunTimes.sunrise,
    sunsetDate: sunTimes.sunset,
    civilTwilightStartDate: sunTimes.civilTwilightStart,
    civilTwilightEndDate: sunTimes.civilTwilightEnd,
    currencyNightDate,
  };
}
