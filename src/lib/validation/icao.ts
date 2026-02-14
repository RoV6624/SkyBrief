/**
 * ICAO airport code validation utilities
 *
 * Validates and normalizes ICAO airport identifier codes.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Normalize an ICAO code (trim and uppercase)
 * @param input - ICAO code input
 * @returns Normalized ICAO code
 */
export function normalizeIcao(input: string): string {
  return input.trim().toUpperCase();
}

/**
 * Check if an ICAO code is valid (basic format check)
 * @param input - ICAO code input
 * @returns true if valid format
 */
export function isValidIcao(input: string): boolean {
  const normalized = normalizeIcao(input);
  return /^[A-Z0-9]{3,4}$/.test(normalized);
}

/**
 * Validate and normalize an ICAO code
 * @param input - ICAO code input
 * @returns Validation result with normalized code if valid
 */
export function validateIcao(input: string): ValidationResult {
  const normalized = normalizeIcao(input);

  if (normalized.length < 3 || normalized.length > 4) {
    return { valid: false, error: "ICAO code must be 3-4 characters" };
  }

  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return {
      valid: false,
      error: "ICAO code must contain only letters and numbers",
    };
  }

  return { valid: true, normalized };
}

/**
 * Validate multiple ICAO codes (for route planning)
 * @param codes - Array of ICAO codes
 * @returns Array of validation results
 */
export function validateIcaoCodes(codes: string[]): ValidationResult[] {
  return codes.map((code) => validateIcao(code));
}

/**
 * Check if all ICAO codes in an array are valid
 * @param codes - Array of ICAO codes
 * @returns true if all codes are valid
 */
export function areAllIcaosValid(codes: string[]): boolean {
  return codes.every((code) => isValidIcao(code));
}
