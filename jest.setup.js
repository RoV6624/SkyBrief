// Minimal Jest setup for SkyBrief tests

// Silence console warnings during tests (optional)
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
