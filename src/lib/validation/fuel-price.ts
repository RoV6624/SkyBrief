/**
 * Fuel price validation utilities
 *
 * Validates fuel price inputs to prevent invalid data submission.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalized?: number;
}

/**
 * Validate a fuel price value
 * @param price - Price value (number or string)
 * @returns Validation result with normalized value if valid
 */
export function validateFuelPrice(price: number | string): ValidationResult {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;

  if (isNaN(numPrice)) {
    return { valid: false, error: "Price must be a valid number" };
  }

  if (numPrice <= 0) {
    return { valid: false, error: "Price must be greater than $0" };
  }

  if (numPrice > 20) {
    return { valid: false, error: "Price must be less than $20.00 per gallon" };
  }

  return { valid: true, normalized: numPrice };
}

/**
 * Validate FBO name input
 * @param name - FBO name string
 * @returns Validation result
 */
export function validateFboName(name: string): ValidationResult {
  if (name.length > 100) {
    return { valid: false, error: "FBO name too long: maximum 100 characters" };
  }

  // Prevent XSS attacks
  if (/<script|javascript:|onerror=/i.test(name)) {
    return { valid: false, error: "Invalid FBO name: contains prohibited characters" };
  }

  return { valid: true };
}

/**
 * Check if a fuel price is realistic
 * @param price - Fuel price in dollars per gallon
 * @returns true if price is in realistic range
 */
export function isRealisticFuelPrice(price: number): boolean {
  // Historical range: $2.50 - $15.00 per gallon for 100LL
  return price >= 2.5 && price <= 15;
}

/**
 * Format a fuel price for display
 * @param price - Fuel price value
 * @returns Formatted price string (e.g., "$6.85")
 */
export function formatFuelPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}
