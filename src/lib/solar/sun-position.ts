// Simplified NOAA solar calculator — pure math, no dependencies
// Calculates sunrise, sunset, and civil twilight times

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

interface SunTimes {
  sunrise: Date;
  sunset: Date;
  civilTwilightStart: Date; // morning civil twilight begins
  civilTwilightEnd: Date; // evening civil twilight ends
}

function julianDay(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d =
    date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;

  const a = Math.floor((14 - m) / 12);
  const yAdj = y + 4800 - a;
  const mAdj = m + 12 * a - 3;

  return (
    d +
    Math.floor((153 * mAdj + 2) / 5) +
    365 * yAdj +
    Math.floor(yAdj / 4) -
    Math.floor(yAdj / 100) +
    Math.floor(yAdj / 400) -
    32045.5
  );
}

function solarDeclination(jd: number): number {
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * DEG_TO_RAD;
  const lambda =
    (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG_TO_RAD;
  return Math.asin(Math.sin(23.44 * DEG_TO_RAD) * Math.sin(lambda));
}

function equationOfTime(jd: number): number {
  const n = jd - 2451545.0;
  const L = ((280.46 + 0.9856474 * n) % 360) * DEG_TO_RAD;
  const g = ((357.528 + 0.9856003 * n) % 360) * DEG_TO_RAD;
  const ecl = 23.44 * DEG_TO_RAD;

  const eot =
    -1.915 * Math.sin(g) -
    0.02 * Math.sin(2 * g) +
    2.466 * Math.sin(2 * L) -
    0.053 * Math.sin(4 * L);

  return eot; // minutes
}

function hourAngle(lat: number, decl: number, angle: number): number {
  const latRad = lat * DEG_TO_RAD;
  const cosH =
    (Math.sin(angle * DEG_TO_RAD) - Math.sin(latRad) * Math.sin(decl)) /
    (Math.cos(latRad) * Math.cos(decl));

  if (cosH > 1) return NaN; // Sun never rises
  if (cosH < -1) return NaN; // Sun never sets

  return Math.acos(cosH) * RAD_TO_DEG;
}

function timeFromHourAngle(
  date: Date,
  lon: number,
  ha: number,
  eot: number,
  isRise: boolean
): Date {
  const noon = 720 - 4 * lon - eot; // minutes from midnight UTC
  const offset = isRise ? -ha * 4 : ha * 4;
  const minutes = noon + offset;

  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCMinutes(Math.round(minutes));
  return result;
}

export function getSunTimes(lat: number, lon: number, date: Date): SunTimes {
  const jd = julianDay(date);
  const decl = solarDeclination(jd);
  const eot = equationOfTime(jd);

  // Sun center at horizon (-0.833 degrees for atmospheric refraction)
  const haSunrise = hourAngle(lat, decl, -0.833);
  // Civil twilight: sun 6 degrees below horizon
  const haCivil = hourAngle(lat, decl, -6);

  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);

  return {
    sunrise: timeFromHourAngle(dayStart, lon, haSunrise, eot, true),
    sunset: timeFromHourAngle(dayStart, lon, haSunrise, eot, false),
    civilTwilightStart: timeFromHourAngle(dayStart, lon, haCivil, eot, true),
    civilTwilightEnd: timeFromHourAngle(dayStart, lon, haCivil, eot, false),
  };
}
