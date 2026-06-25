/* eslint-env node */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js)'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Transpile JS/JSX too (e.g. ESM `src/` helpers imported by tests).
  // `isolatedModules` = transpile-only, so loosely-typed backend JS isn't
  // type-checked and rejected.
  transform: {
    '^.+\\.[jt]sx?$': ['ts-jest', { isolatedModules: true }],
  },
};
