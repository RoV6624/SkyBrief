import { getSunTimes } from '../sun-position';

describe('sun-position', () => {
  describe('getSunTimes', () => {
    describe('Sunset calculation accuracy', () => {
      it('should calculate sunset accurately for KJFK on March 15, 2024', () => {
        // KJFK: 40.6413°N, 73.7781°W
        // Using NOAA solar calculator as reference
        // Expected sunset around 23:00-23:30 UTC (6:00-6:30 PM EDT would be ~22:00-22:30 UTC in EST)
        const lat = 40.6413;
        const lon = -73.7781;
        const testDate = new Date('2024-03-15T12:00:00Z');

        const sunTimes = getSunTimes(lat, lon, testDate);

        // Verify sunset is a valid Date
        expect(sunTimes.sunset).toBeInstanceOf(Date);
        expect(sunTimes.sunset.toISOString()).toContain('2024-03-15');

        // Sunset should be in the evening (between 18:00 and 00:00 UTC for this location)
        const sunsetHour = sunTimes.sunset.getUTCHours();
        expect(sunsetHour).toBeGreaterThanOrEqual(18);
        expect(sunsetHour).toBeLessThan(24);
      });

      it('should calculate sunset accurately for KMIA on March 15, 2024', () => {
        // KMIA: 25.8°N, 80.2°W
        const lat = 25.8;
        const lon = -80.2;
        const testDate = new Date('2024-03-15T12:00:00Z');

        const sunTimes = getSunTimes(lat, lon, testDate);

        expect(sunTimes.sunset).toBeInstanceOf(Date);
        // Miami sunset should be earlier in UTC due to being further west and south
        const sunsetHour = sunTimes.sunset.getUTCHours();
        expect(sunsetHour).toBeGreaterThanOrEqual(22);
        expect(sunsetHour).toBeLessThan(24);
      });

      it('should produce different sunset times for different latitudes on same date', () => {
        const testDate = new Date('2024-03-15T12:00:00Z');
        const lon = -73.0; // Same longitude

        // Higher latitude (north)
        const northernSunset = getSunTimes(45.0, lon, testDate);

        // Lower latitude (south)
        const southernSunset = getSunTimes(30.0, lon, testDate);

        // Times should be different
        expect(northernSunset.sunset.getTime()).not.toBe(southernSunset.sunset.getTime());
      });

      it('should show seasonal variation in sunset times', () => {
        const lat = 40.6413;
        const lon = -73.7781;

        // Summer solstice (late sunset)
        const summerSunset = getSunTimes(lat, lon, new Date('2024-06-21T12:00:00Z'));

        // Winter solstice (early sunset)
        const winterSunset = getSunTimes(lat, lon, new Date('2024-12-21T12:00:00Z'));

        // Summer sunset should have a later absolute time (comparing timestamps)
        // Even though UTC hour might wrap to next day
        const dayLength = (summerSunset.sunset.getTime() - summerSunset.sunrise.getTime()) / 3600000;
        const winterDayLength = (winterSunset.sunset.getTime() - winterSunset.sunrise.getTime()) / 3600000;

        // Summer days are longer than winter days
        expect(dayLength).toBeGreaterThan(winterDayLength);
      });
    });

    describe('Civil twilight timing', () => {
      it('should have civil twilight end after sunset', () => {
        const testDate = new Date('2024-03-15T12:00:00Z');
        const sunTimes = getSunTimes(40.6413, -73.7781, testDate);

        expect(sunTimes.civilTwilightEnd.getTime()).toBeGreaterThan(sunTimes.sunset.getTime());
      });

      it('should have civil twilight start before sunrise', () => {
        const testDate = new Date('2024-03-15T12:00:00Z');
        const sunTimes = getSunTimes(40.6413, -73.7781, testDate);

        expect(sunTimes.civilTwilightStart.getTime()).toBeLessThan(sunTimes.sunrise.getTime());
      });

      it('should calculate civil twilight duration correctly', () => {
        const testDate = new Date('2024-03-15T12:00:00Z');
        const sunTimes = getSunTimes(40.6413, -73.7781, testDate);

        // Civil twilight is when sun is 6 degrees below horizon
        // Duration should be reasonable (typically 20-30 minutes at mid-latitudes)
        const morningDuration =
          (sunTimes.sunrise.getTime() - sunTimes.civilTwilightStart.getTime()) / 60000;
        const eveningDuration =
          (sunTimes.civilTwilightEnd.getTime() - sunTimes.sunset.getTime()) / 60000;

        expect(morningDuration).toBeGreaterThan(15);
        expect(morningDuration).toBeLessThan(40);
        expect(eveningDuration).toBeGreaterThan(15);
        expect(eveningDuration).toBeLessThan(40);
      });
    });

    describe('Sunrise before sunset sanity check', () => {
      it('should always have sunrise before sunset on the same day', () => {
        const testDate = new Date('2024-03-15T12:00:00Z');
        const sunTimes = getSunTimes(40.6413, -73.7781, testDate);

        expect(sunTimes.sunrise.getTime()).toBeLessThan(sunTimes.sunset.getTime());
      });

      it('should maintain sunrise-sunset order across all seasons', () => {
        const lat = 40.6413;
        const lon = -73.7781;

        const dates = [
          new Date('2024-01-15T12:00:00Z'),
          new Date('2024-04-15T12:00:00Z'),
          new Date('2024-07-15T12:00:00Z'),
          new Date('2024-10-15T12:00:00Z'),
        ];

        dates.forEach((date) => {
          const sunTimes = getSunTimes(lat, lon, date);
          expect(sunTimes.sunrise.getTime()).toBeLessThan(sunTimes.sunset.getTime());
        });
      });

      it('should have reasonable day length', () => {
        const testDate = new Date('2024-03-15T12:00:00Z'); // Near equinox
        const sunTimes = getSunTimes(40.6413, -73.7781, testDate);

        const dayLengthHours =
          (sunTimes.sunset.getTime() - sunTimes.sunrise.getTime()) / 3600000;

        // Near equinox, day should be approximately 12 hours
        expect(dayLengthHours).toBeGreaterThan(11);
        expect(dayLengthHours).toBeLessThan(13);
      });
    });

    describe('Handle edge cases', () => {
      it('should return NaN for polar regions during polar night', () => {
        // North of Arctic Circle in winter
        const lat = 70;
        const lon = 0;
        const winterDate = new Date('2024-12-21T12:00:00Z');

        const sunTimes = getSunTimes(lat, lon, winterDate);

        // During polar night, sun never rises
        expect(isNaN(sunTimes.sunrise.getTime())).toBe(true);
      });

      it('should return NaN for polar regions during midnight sun', () => {
        // North of Arctic Circle in summer
        const lat = 70;
        const lon = 0;
        const summerDate = new Date('2024-06-21T12:00:00Z');

        const sunTimes = getSunTimes(lat, lon, summerDate);

        // During midnight sun, sun never sets
        expect(isNaN(sunTimes.sunset.getTime())).toBe(true);
      });

      it('should handle equator location', () => {
        const lat = 0;
        const lon = 0;
        const testDate = new Date('2024-03-15T12:00:00Z');

        const sunTimes = getSunTimes(lat, lon, testDate);

        expect(sunTimes.sunrise).toBeInstanceOf(Date);
        expect(sunTimes.sunset).toBeInstanceOf(Date);
        expect(!isNaN(sunTimes.sunrise.getTime())).toBe(true);
        expect(!isNaN(sunTimes.sunset.getTime())).toBe(true);
      });

      it('should handle southern hemisphere location', () => {
        // Sydney, Australia
        const lat = -33.87;
        const lon = 151.21;
        const testDate = new Date('2024-03-15T12:00:00Z');

        const sunTimes = getSunTimes(lat, lon, testDate);

        expect(sunTimes.sunrise).toBeInstanceOf(Date);
        expect(sunTimes.sunset).toBeInstanceOf(Date);
        expect(sunTimes.sunrise.getTime()).toBeLessThan(sunTimes.sunset.getTime());
      });
    });

    describe('Chronological ordering', () => {
      it('should have all times in correct order for normal day', () => {
        const testDate = new Date('2024-03-15T12:00:00Z');
        const sunTimes = getSunTimes(40.6413, -73.7781, testDate);

        // Morning sequence
        expect(sunTimes.civilTwilightStart.getTime()).toBeLessThan(sunTimes.sunrise.getTime());

        // Evening sequence
        expect(sunTimes.sunset.getTime()).toBeLessThan(sunTimes.civilTwilightEnd.getTime());

        // Full day sequence
        expect(sunTimes.civilTwilightStart.getTime()).toBeLessThan(
          sunTimes.civilTwilightEnd.getTime()
        );
      });
    });

    describe('Date consistency', () => {
      it('should calculate times for the correct date', () => {
        const testDate = new Date('2024-03-15T12:00:00Z');
        const sunTimes = getSunTimes(40.6413, -73.7781, testDate);

        // All times should be on the same UTC date
        expect(sunTimes.sunrise.toISOString().substring(0, 10)).toBe('2024-03-15');
        expect(sunTimes.sunset.toISOString().substring(0, 10)).toBe('2024-03-15');
      });

      it('should handle different input times on same date consistently', () => {
        const lat = 40.6413;
        const lon = -73.7781;

        // Same date, different times
        const morning = getSunTimes(lat, lon, new Date('2024-03-15T06:00:00Z'));
        const noon = getSunTimes(lat, lon, new Date('2024-03-15T12:00:00Z'));
        const evening = getSunTimes(lat, lon, new Date('2024-03-15T20:00:00Z'));

        // Should all calculate sunset times that are very close (within 1 minute)
        // Small variations can occur due to rounding in the algorithm
        const timeDiff1 = Math.abs(morning.sunset.getTime() - noon.sunset.getTime());
        const timeDiff2 = Math.abs(noon.sunset.getTime() - evening.sunset.getTime());

        expect(timeDiff1).toBeLessThanOrEqual(60000); // 1 minute or less
        expect(timeDiff2).toBeLessThanOrEqual(60000); // 1 minute or less
      });
    });

    describe('Longitude effects', () => {
      it('should show earlier sunset times for eastern longitudes', () => {
        const lat = 40.0;
        const testDate = new Date('2024-03-15T12:00:00Z');

        // Eastern location
        const eastSunset = getSunTimes(lat, -70, testDate);

        // Western location
        const westSunset = getSunTimes(lat, -120, testDate);

        // East should have earlier UTC time
        expect(eastSunset.sunset.getTime()).toBeLessThan(westSunset.sunset.getTime());
      });
    });
  });
});
