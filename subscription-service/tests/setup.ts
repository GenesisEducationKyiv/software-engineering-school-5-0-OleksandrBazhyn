import "@jest/globals";
import { jest } from "@jest/globals";

global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
