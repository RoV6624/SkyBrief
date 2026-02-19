import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { fetchWeatherData } from "./weather/fetch-weather";
import { generateBriefing } from "./weather/briefing-engine";
import { sendBriefingEmail } from "./email/resend-client";
import { buildEmailHtml } from "./email/templates";
import { logger } from "firebase-functions/v2";

// Initialize Firebase Admin (idempotent check)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

/**
 * Map of UTC offsets (in hours) to IANA timezone names.
 * We compute which UTC offset corresponds to 8 AM local,
 * then query Firestore for users in those timezones.
 */
function getTimezonesForUtcOffset(targetOffset: number): string[] {
  // Common IANA timezones grouped by standard UTC offset.
  // DST shifts are handled by checking the actual current offset at runtime.
  const timezonesByOffset: Record<string, string[]> = {
    "-12": ["Etc/GMT+12"],
    "-11": ["Pacific/Pago_Pago", "Pacific/Midway"],
    "-10": ["Pacific/Honolulu", "US/Hawaii"],
    "-9": ["America/Anchorage", "US/Alaska"],
    "-8": ["America/Los_Angeles", "US/Pacific", "America/Vancouver"],
    "-7": ["America/Denver", "US/Mountain", "America/Phoenix", "America/Edmonton"],
    "-6": ["America/Chicago", "US/Central", "America/Mexico_City", "America/Winnipeg"],
    "-5": ["America/New_York", "US/Eastern", "America/Toronto", "America/Bogota"],
    "-4": ["America/Halifax", "America/Caracas", "America/Santiago"],
    "-3": ["America/Sao_Paulo", "America/Buenos_Aires", "America/Argentina/Buenos_Aires"],
    "-2": ["Atlantic/South_Georgia"],
    "-1": ["Atlantic/Azores", "Atlantic/Cape_Verde"],
    "0": ["Europe/London", "UTC", "Africa/Accra", "Atlantic/Reykjavik"],
    "1": ["Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Africa/Lagos"],
    "2": ["Europe/Helsinki", "Africa/Cairo", "Europe/Athens", "Africa/Johannesburg"],
    "3": ["Europe/Moscow", "Asia/Baghdad", "Africa/Nairobi"],
    "4": ["Asia/Dubai", "Asia/Baku"],
    "5": ["Asia/Karachi", "Asia/Tashkent"],
    "5.5": ["Asia/Kolkata", "Asia/Calcutta"],
    "5.75": ["Asia/Kathmandu"],
    "6": ["Asia/Dhaka", "Asia/Almaty"],
    "6.5": ["Asia/Yangon"],
    "7": ["Asia/Bangkok", "Asia/Jakarta"],
    "8": ["Asia/Shanghai", "Asia/Singapore", "Asia/Taipei", "Australia/Perth"],
    "9": ["Asia/Tokyo", "Asia/Seoul"],
    "9.5": ["Australia/Darwin", "Australia/Adelaide"],
    "10": ["Australia/Sydney", "Australia/Melbourne", "Pacific/Guam"],
    "11": ["Pacific/Noumea", "Asia/Magadan"],
    "12": ["Pacific/Auckland", "Pacific/Fiji"],
    "13": ["Pacific/Tongatapu"],
  };

  const key = String(targetOffset);
  return timezonesByOffset[key] ?? [];
}


/**
 * Find all IANA timezone strings where the local time is currently the target hour (e.g., 8 AM).
 */
function findTimezonesAtLocalHour(targetHour: number): string[] {
  const allTimezones = Object.values(getTimezonesForUtcOffset(0))
    .concat(...Array.from({ length: 27 }, (_, i) => {
      const offset = i - 12;
      return getTimezonesForUtcOffset(offset);
    }));

  // Also include half-hour offsets
  const halfHourTimezones = [
    ...getTimezonesForUtcOffset(5.5),
    ...getTimezonesForUtcOffset(5.75),
    ...getTimezonesForUtcOffset(6.5),
    ...getTimezonesForUtcOffset(9.5),
  ];

  const uniqueTimezones = [...new Set([...allTimezones, ...halfHourTimezones])];
  const matching: string[] = [];

  for (const tz of uniqueTimezones) {
    if (!tz) continue;
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        hour12: false,
      });
      const localHour = parseInt(formatter.format(now), 10);
      if (localHour === targetHour) {
        matching.push(tz);
      }
    } catch {
      // Skip invalid timezone
    }
  }

  return matching;
}

interface UserBriefingDoc {
  uid: string;
  email: string;
  pilotName: string;
  homeAirport: string;
  timezone: string;
  dailyBriefingEnabled: boolean;
}

/**
 * Scheduled Cloud Function - runs every hour.
 * Finds users whose local time is 8 AM, fetches weather for their
 * home airport, generates a briefing, and sends it via email.
 */
export const dailyBriefingScheduled = onSchedule(
  {
    schedule: "every 1 hours",
    timeoutSeconds: 300,
    memory: "256MiB",
    secrets: [RESEND_API_KEY],
  },
  async () => {
    const TARGET_HOUR = 8; // 8 AM local time
    const BATCH_SIZE = 10; // Process users in batches to avoid memory spikes

    // 1. Find timezones where it's currently 8 AM
    const matchingTimezones = findTimezonesAtLocalHour(TARGET_HOUR);

    if (matchingTimezones.length === 0) {
      logger.info("No timezones currently at 8 AM. Skipping.");
      return;
    }

    logger.info(`Timezones at ${TARGET_HOUR}:00 local: ${matchingTimezones.join(", ")}`);

    // 2. Query Firestore for users with daily briefing enabled in matching timezones.
    //    Firestore 'in' queries support up to 30 values, which covers our case.
    //    If more than 30 timezones match, we chunk the query.
    const allUsers: UserBriefingDoc[] = [];

    for (let i = 0; i < matchingTimezones.length; i += 30) {
      const chunk = matchingTimezones.slice(i, i + 30);
      const snapshot = await db
        .collection("users")
        .where("dailyBriefingEnabled", "==", true)
        .where("timezone", "in", chunk)
        .get();

      snapshot.forEach((doc) => {
        const data = doc.data();
        allUsers.push({
          uid: doc.id,
          email: data.email ?? "",
          pilotName: data.pilotName ?? "Pilot",
          homeAirport: data.homeAirport ?? "",
          timezone: data.timezone ?? "",
          dailyBriefingEnabled: data.dailyBriefingEnabled ?? false,
        });
      });
    }

    // Filter out users with missing data
    const eligibleUsers = allUsers.filter(
      (u) => u.email && u.homeAirport && u.homeAirport.length >= 3
    );

    if (eligibleUsers.length === 0) {
      logger.info("No eligible users found for daily briefing.");
      return;
    }

    logger.info(`Processing daily briefings for ${eligibleUsers.length} users.`);

    // 3. Process users in batches
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < eligibleUsers.length; i += BATCH_SIZE) {
      const batch = eligibleUsers.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((user) => processUserBriefing(user))
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          successCount++;
        } else {
          failureCount++;
          if (result.status === "rejected") {
            logger.error(`Briefing failed: ${result.reason}`);
          }
        }
      }
    }

    logger.info(
      `Daily briefing complete: ${successCount} sent, ${failureCount} failed out of ${eligibleUsers.length} users.`
    );

    // 4. Log summary to Firestore for monitoring
    await db.collection("briefing_logs").add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      totalUsers: eligibleUsers.length,
      successCount,
      failureCount,
      timezones: matchingTimezones,
    });
  }
);

/**
 * Process a single user's daily briefing:
 * fetch weather, generate briefing, build email, send.
 */
async function processUserBriefing(user: UserBriefingDoc): Promise<boolean> {
  const { uid, email, pilotName, homeAirport } = user;

  try {
    // Fetch weather data for the user's home airport
    const weather = await fetchWeatherData(homeAirport);

    if (!weather) {
      logger.warn(`No weather data available for ${homeAirport} (user: ${uid})`);
      return false;
    }

    // Generate briefing from weather data
    const briefing = generateBriefing(weather.metar, weather.taf);

    // Build the email HTML
    const now = new Date();
    const html = buildEmailHtml({
      station: homeAirport,
      pilotName,
      metar: weather.metar,
      taf: weather.taf,
      briefing,
      date: now,
    });

    // Format the subject line
    const categoryEmoji =
      weather.metar.flightCategory === "VFR"
        ? "🟢"
        : weather.metar.flightCategory === "MVFR"
        ? "🟡"
        : weather.metar.flightCategory === "IFR"
        ? "🔴"
        : "🟣";

    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    const subject = `${categoryEmoji} SkyBrief: ${homeAirport} is ${weather.metar.flightCategory} — ${dateStr}`;

    // Send the email
    const sent = await sendBriefingEmail({
      apiKey: RESEND_API_KEY.value(),
      to: email,
      subject,
      html,
    });

    if (sent) {
      // Record successful delivery in user's subcollection
      await db
        .collection("users")
        .doc(uid)
        .collection("briefing_history")
        .add({
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          station: homeAirport,
          flightCategory: weather.metar.flightCategory,
          recommendation: briefing.recommendation,
          goNoGo: briefing.goNoGo,
        });

      logger.info(`Briefing sent to ${email} for ${homeAirport}`);
      return true;
    }

    logger.warn(`Failed to send briefing email to ${email}`);
    return false;
  } catch (error) {
    logger.error(`Error processing briefing for user ${uid}: ${error}`);
    return false;
  }
}
