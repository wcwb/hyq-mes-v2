export default {
  testMatch: [
    '**/tests/e2e/**/*.test.cjs',
    '**/tests/e2e/**/*.test.js'
  ],
  testEnvironment: 'node',
  setupFilesAfterEnv: [],
  testTimeout: 60000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};