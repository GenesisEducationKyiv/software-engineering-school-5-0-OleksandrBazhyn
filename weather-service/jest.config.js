export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "esnext",
          target: "es2020",
          moduleResolution: "node",
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          skipLibCheck: true,
          isolatedModules: true,
        },
      },
    ],
  },
  testMatch: ["**/tests/**/*.test.ts"],
  forceExit: true,
  clearMocks: true,
  collectCoverage: false,
  verbose: true,
  setupFilesAfterEnv: [],
  globals: {
    __filename: true,
    __dirname: true,
  },
};
