/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.test.ts'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts', // Skip main entry point
    '!src/**/*.d.ts',
    '!src/ui/**/*' // Skip UI directory if it exists
  ],
  
  // Module path mapping to match our src structure
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(rot-js)/)'
  ],
  
  // Verbose output for initial setup
  verbose: true,
  
  // Coverage thresholds (start low, increase over time)
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30
    }
  }
};