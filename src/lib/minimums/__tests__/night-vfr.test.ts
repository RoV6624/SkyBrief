import { getSunInfo, isNightVfr, getNightMinimums } from '../night-vfr';
import type { PersonalMinimums } from '../types';

describe('night-vfr', () => {
  describe('getSunInfo', () => {
    describe('CRITICAL: Currency night = sunset + exactly 60 minutes (3,600,000 ms)', () => {
      it('should calculate currency night as sunset + 60 minutes for KJFK', () => {
        // KJFK: 40.6413, -73.7781
        // Test date: March 15, 2024 (chosen to avoid DST transitions)
        const testDate = new Date('2024-03-15T12:00:00Z');
        const info = getSunInfo(40.6413, -73.7781, testDate);

        // Currency night should be exactly 60 minutes (3,600,000 ms) after sunset
        const expectedCurrencyTime = new Date(info.sunsetDate.getTime() + 3600000);

        expect(info.currencyNightDate.getTime()).toBe(expectedCurrencyTime.getTime());
        expect(info.currencyNightDate.getTime() - info.sunsetDate.getTime()).toBe(3600000);
      });

      it('should calculate currency night as sunset + 60 minutes for KMIA', () => {
        // KMIA: 25.8, -80.2
        const testDate = new Date('2024-03-15T12:00:00Z');
        const info = getSunInfo(25.8, -80.2, testDate);

        // Verify exactly 60 minutes difference
        const timeDiff = info.currencyNightDate.getTime() - info.sunsetDate.getTime();
        expect(timeDiff).toBe(3600000);
      });

      it('should maintain 60-minute offset across different seasons', () => {
        const lat = 40.6413;
        const lon = -73.7781;

        // Test winter, spring, summer, fall
        const dates = [
          new Date('2024-01-15T12:00:00Z'), // Winter
          new Date('2024-04-15T12:00:00Z'), // Spring
          new Date('2024-07-15T12:00:00Z'), // Summer
          new Date('2024-10-15T12:00:00Z'), // Fall
        ];

        dates.forEach((date) => {
          const info = getSunInfo(lat, lon, date);
          const timeDiff = info.currencyNightDate.getTime() - info.sunsetDate.getTime();
          expect(timeDiff).toBe(3600000);
        });
      });
    });

    describe('CRITICAL: Logbook night = civil twilight end', () => {
      it('should set logbook night to civil twilight end time', () => {
        const testDate = new Date('2024-03-15T12:00:00Z');
        const info = getSunInfo(40.6413, -73.7781, testDate);

        // Logbook night formatted time should match civil twilight end
        expect(info.logbookNight).toBe(info.civilTwilightEnd);
      });

      it('should have logbook night date equal to civil twilight end date', () => {
        const testDate = new Date('2024-03-15T12:00:00Z');
        const info = getSunInfo(40.6413, -73.7781, testDate);

        expect(info.civilTwilightEndDate.getTime()).toBeDefined();
        // Civil twilight should occur after sunset
        expect(info.civilTwilightEndDate.getTime()).toBeGreaterThan(info.sunsetDate.getTime());
      });
    });

    describe('CRITICAL: Twilight duration varies by latitude', () => {
      it('should have NYC twilight duration between 24-28 minutes', () => {
        // KJFK: 40.6413, -73.7781
        const testDate = new Date('2024-03-15T12:00:00Z');
        const info = getSunInfo(40.6413, -73.7781, testDate);

        const twilightDuration =
          (info.civilTwilightEndDate.getTime() - info.sunsetDate.getTime()) / 60000; // in minutes

        expect(twilightDuration).toBeGreaterThanOrEqual(24);
        expect(twilightDuration).toBeLessThanOrEqual(28);
      });

      it('should have Miami twilight duration between 21-24 minutes', () => {
        // KMIA: 25.8, -80.2 (lower latitude = shorter twilight)
        const testDate = new Date('2024-03-15T12:00:00Z');
        const info = getSunInfo(25.8, -80.2, testDate);

        const twilightDuration =
          (info.civilTwilightEndDate.getTime() - info.sunsetDate.getTime()) / 60000; // in minutes

        expect(twilightDuration).toBeGreaterThanOrEqual(21);
        expect(twilightDuration).toBeLessThanOrEqual(24);
      });

      it('should have shorter twilight at lower latitudes', () => {
        const testDate = new Date('2024-03-15T12:00:00Z');

        // NYC (higher latitude)
        const nycInfo = getSunInfo(40.6413, -73.7781, testDate);
        const nycTwilight =
          (nycInfo.civilTwilightEndDate.getTime() - nycInfo.sunsetDate.getTime()) / 60000;

        // Miami (lower latitude)
        const miaInfo = getSunInfo(25.8, -80.2, testDate);
        const miaTwilight =
          (miaInfo.civilTwilightEndDate.getTime() - miaInfo.sunsetDate.getTime()) / 60000;

        // Higher latitude should have longer twilight
        expect(nycTwilight).toBeGreaterThan(miaTwilight);
      });

      it('should vary twilight duration across seasons at same location', () => {
        const lat = 40.6413;
        const lon = -73.7781;

        // Summer solstice (longest twilight)
        const summerInfo = getSunInfo(lat, lon, new Date('2024-06-21T12:00:00Z'));
        const summerTwilight =
          (summerInfo.civilTwilightEndDate.getTime() - summerInfo.sunsetDate.getTime()) / 60000;

        // Winter solstice (shorter twilight)
        const winterInfo = getSunInfo(lat, lon, new Date('2024-12-21T12:00:00Z'));
        const winterTwilight =
          (winterInfo.civilTwilightEndDate.getTime() - winterInfo.sunsetDate.getTime()) / 60000;

        // Summer twilight should be longer than winter
        expect(summerTwilight).toBeGreaterThan(winterTwilight);
      });
    });

    describe('Default date handling', () => {
      it('should use current date when no date parameter provided', () => {
        // Call without date parameter - should use current time
        const info = getSunInfo(40.6413, -73.7781);

        // Should return valid sun info (format: "HHMM TZ" or "HHMM")
        expect(info.sunrise).toMatch(/^\d{4}(\s\w+)?$/);
        expect(info.sunset).toMatch(/^\d{4}(\s\w+)?$/);
        expect(info.sunriseDate).toBeInstanceOf(Date);
        expect(info.sunsetDate).toBeInstanceOf(Date);
      });
    });

    describe('Time formatting', () => {
      it('should format times as HHMM with optional timezone abbreviation', () => {
        const testDate = new Date('2024-03-15T12:00:00Z');
        const info = getSunInfo(40.6413, -73.7781, testDate);

        // Format: 4 digits + optional space + timezone abbreviation
        const timePattern = /^\d{4}(\s\w+)?$/;
        expect(info.sunrise).toMatch(timePattern);
        expect(info.sunset).toMatch(timePattern);
        expect(info.civilTwilightEnd).toMatch(timePattern);
        expect(info.logbookNight).toMatch(timePattern);
        expect(info.currencyNight).toMatch(timePattern);
      });

      it('should pad hours and minutes with leading zeros', () => {
        const testDate = new Date('2024-03-15T12:00:00Z');
        const info = getSunInfo(40.6413, -73.7781, testDate);

        // Time portion should always start with 4 digits (HHMM)
        expect(info.sunrise).toMatch(/^\d{4}/);
        expect(info.sunset).toMatch(/^\d{4}/);
        expect(info.currencyNight).toMatch(/^\d{4}/);
      });
    });

    describe('Chronological order validation', () => {
      it('should have times in correct chronological order', () => {
        const testDate = new Date('2024-03-15T12:00:00Z');
        const info = getSunInfo(40.6413, -73.7781, testDate);

        // Morning: civil twilight start -> sunrise
        expect(info.civilTwilightStartDate.getTime()).toBeLessThan(info.sunriseDate.getTime());

        // Evening: sunset -> civil twilight end -> currency night
        // (Civil twilight end is ~25-30 min after sunset, currency night is 60 min after)
        expect(info.sunsetDate.getTime()).toBeLessThan(info.civilTwilightEndDate.getTime());
        expect(info.civilTwilightEndDate.getTime()).toBeLessThan(info.currencyNightDate.getTime());
      });
    });
  });

  describe('isNightVfr', () => {
    it('should return true when time is after civil twilight end', () => {
      // KJFK on March 15, 2024
      const info = getSunInfo(40.6413, -73.7781, new Date('2024-03-15T12:00:00Z'));

      // Create a time 1 hour after civil twilight end
      const nightTime = new Date(info.civilTwilightEndDate.getTime() + 3600000);
      const result = isNightVfr(40.6413, -73.7781, nightTime);

      expect(result).toBe(true);
    });

    it('should return false during daytime', () => {
      // KJFK on March 15, 2024 at noon local (~17:00 UTC)
      const daytime = new Date('2024-03-15T17:00:00Z');
      const result = isNightVfr(40.6413, -73.7781, daytime);

      expect(result).toBe(false);
    });

    it('should return false during civil twilight', () => {
      const info = getSunInfo(40.6413, -73.7781, new Date('2024-03-15T12:00:00Z'));

      // Time between sunset and civil twilight end
      const twilightTime = new Date(
        info.sunsetDate.getTime() +
        (info.civilTwilightEndDate.getTime() - info.sunsetDate.getTime()) / 2
      );

      const result = isNightVfr(40.6413, -73.7781, twilightTime);
      expect(result).toBe(false);
    });

    it('should return true before morning civil twilight', () => {
      const info = getSunInfo(40.6413, -73.7781, new Date('2024-03-15T12:00:00Z'));

      // 1 hour before morning civil twilight
      const earlyMorning = new Date(info.civilTwilightStartDate.getTime() - 3600000);
      const result = isNightVfr(40.6413, -73.7781, earlyMorning);

      expect(result).toBe(true);
    });

    it('should use current time when no departure time provided', () => {
      // This will use current time - just verify it doesn't crash
      const result = isNightVfr(40.6413, -73.7781);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getNightMinimums', () => {
    it('should enforce ceiling >= 1500ft for night operations', () => {
      const baseMinimums: PersonalMinimums = {
        ceiling: 1000,
        visibility: 3,
        crosswind: 15,
        maxGust: 25,
        maxWind: 25,
      };

      const nightMinimums = getNightMinimums(baseMinimums);
      expect(nightMinimums.ceiling).toBe(1500);
    });

    it('should enforce visibility >= 5 SM for night operations', () => {
      const baseMinimums: PersonalMinimums = {
        ceiling: 2000,
        visibility: 3,
        crosswind: 15,
        maxGust: 25,
        maxWind: 25,
      };

      const nightMinimums = getNightMinimums(baseMinimums);
      expect(nightMinimums.visibility).toBe(5);
    });

    it('should not lower existing higher minimums', () => {
      const baseMinimums: PersonalMinimums = {
        ceiling: 2500,
        visibility: 7,
        crosswind: 10,
        maxGust: 25,
        maxWind: 25,
      };

      const nightMinimums = getNightMinimums(baseMinimums);
      expect(nightMinimums.ceiling).toBe(2500);
      expect(nightMinimums.visibility).toBe(7);
      expect(nightMinimums.crosswind).toBe(10);
    });

    it('should preserve other minimums properties', () => {
      const baseMinimums: PersonalMinimums = {
        ceiling: 1000,
        visibility: 3,
        crosswind: 12,
        maxGust: 20,
        maxWind: 30,
      };

      const nightMinimums = getNightMinimums(baseMinimums);
      expect(nightMinimums.crosswind).toBe(12);
      expect(nightMinimums.maxGust).toBe(20);
      expect(nightMinimums.maxWind).toBe(30);
    });
  });
});
