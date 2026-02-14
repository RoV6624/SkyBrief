module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|react-native-svg|react-native-css-interop|@react-native-community|@react-native-firebase|lucide-react-native)/)'
  ],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/lib/solar/**/*.ts',
    'src/lib/minimums/**/*.ts',
    'src/components/weather/**/*.tsx',
    '!**/__tests__/**',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    'src/lib/solar/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/lib/minimums/night-vfr.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
