module.exports = {
  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/backend/src/**/*.test.js'],
    },
    {
      displayName: 'frontend-user',
      rootDir: '<rootDir>/frontend-user',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/**/*.test.js'],
    },
    {
      displayName: 'frontend-staff',
      rootDir: '<rootDir>/frontend-staff',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/**/*.test.js'],
    },
  ],
};
