/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.spec.ts"],
  clearMocks: true,
  collectCoverageFrom: [
    "src/admin/**/*.ts",
    "!src/admin/**/*.module.ts",
    "!src/admin/**/*.dto.ts",
  ],
};
