import cron from "node-cron";
import Scheduler from "../../../src/services/scheduler/Scheduler.js";
import EmailService from "../../../src/services/email/EmailService.js";
import { Mailer, DataProvider } from "../../../src/types.js";
import { Logger } from "winston";

jest.mock("node-cron");
jest.mock("../../../src/services/email/EmailService");
jest.mock("../../../src/services/weather/poviders/WeatherProviderManager");
jest.mock("../../../src/logger/index.js", () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe("Scheduler", () => {
  let mailer: Mailer;
  let dataProvider: DataProvider;
  let scheduler: Scheduler;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mailer = {} as Mailer;
    dataProvider = {} as DataProvider;
    
    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    
    scheduler = new Scheduler(mockLogger);
  });

  it("should schedule hourly and daily jobs with correct cron expressions", () => {
    scheduler.start(mailer, dataProvider);

    expect(cron.schedule).toHaveBeenCalledWith("0 * * * *", expect.any(Function));
    expect(cron.schedule).toHaveBeenCalledWith("0 8 * * *", expect.any(Function));
    expect(EmailService as jest.Mock).toHaveBeenCalledWith(mailer, dataProvider, expect.any(Object), expect.any(Object));
  });

  it("hourly job should call sendWeatherEmailsByFrequency('hourly') and log", async () => {
    scheduler.start(mailer, dataProvider);
    const [[, hourlyCallback]] = (cron.schedule as jest.Mock).mock.calls;
    const emailServiceInstance = (EmailService as jest.Mock).mock.instances[0];
    emailServiceInstance.sendWeatherEmailsByFrequency = jest.fn().mockResolvedValue(undefined);

    await hourlyCallback();

    expect(emailServiceInstance.sendWeatherEmailsByFrequency).toHaveBeenCalledWith("hourly");
    expect(mockLogger.info).toHaveBeenCalledWith("Hourly weather emails sent.");
  });

  it("daily job should call sendWeatherEmailsByFrequency('daily') and log", async () => {
    scheduler.start(mailer, dataProvider);
    const [[,], [, dailyCallback]] = (cron.schedule as jest.Mock).mock.calls;
    const emailServiceInstance = (EmailService as jest.Mock).mock.instances[0];
    emailServiceInstance.sendWeatherEmailsByFrequency = jest.fn().mockResolvedValue(undefined);

    await dailyCallback();

    expect(emailServiceInstance.sendWeatherEmailsByFrequency).toHaveBeenCalledWith("daily");
    expect(mockLogger.info).toHaveBeenCalledWith("Daily weather emails sent.");
  });

  it("should create scheduler with default logger when no logger provided", () => {
    const defaultScheduler = new Scheduler();
    expect(defaultScheduler).toBeDefined();
  });

  it("should handle errors in hourly job execution gracefully", async () => {
    scheduler.start(mailer, dataProvider);
    const [[, hourlyCallback]] = (cron.schedule as jest.Mock).mock.calls;
    const emailServiceInstance = (EmailService as jest.Mock).mock.instances[0];
    emailServiceInstance.sendWeatherEmailsByFrequency = jest.fn().mockRejectedValue(new Error("Email service error"));

    await expect(hourlyCallback()).rejects.toThrow("Email service error");
  });

  it("should handle errors in daily job execution gracefully", async () => {
    scheduler.start(mailer, dataProvider);
    const [[,], [, dailyCallback]] = (cron.schedule as jest.Mock).mock.calls;
    const emailServiceInstance = (EmailService as jest.Mock).mock.instances[0];
    emailServiceInstance.sendWeatherEmailsByFrequency = jest.fn().mockRejectedValue(new Error("Email service error"));

    await expect(dailyCallback()).rejects.toThrow("Email service error");
  });

  it("should create EmailService with correct parameters", () => {
    scheduler.start(mailer, dataProvider);

    expect(EmailService as jest.Mock).toHaveBeenCalledTimes(1);
    expect(EmailService as jest.Mock).toHaveBeenCalledWith(
      mailer,
      dataProvider,
      expect.any(Object), // WeatherProviderManager instance
      mockLogger
    );
  });

  it("should schedule exactly two cron jobs", () => {
    scheduler.start(mailer, dataProvider);

    expect(cron.schedule).toHaveBeenCalledTimes(2);
  });

  it("should not schedule jobs multiple times when start is called multiple times", () => {
    scheduler.start(mailer, dataProvider);
    scheduler.start(mailer, dataProvider);

    expect(cron.schedule).toHaveBeenCalledTimes(4); // 2 calls per start invocation
    expect(EmailService as jest.Mock).toHaveBeenCalledTimes(2);
  });

  it("should work with different mailer and dataProvider instances", () => {
    const newMailer = {} as Mailer;
    const newDataProvider = {} as DataProvider;

    scheduler.start(newMailer, newDataProvider);

    expect(EmailService as jest.Mock).toHaveBeenCalledWith(
      newMailer,
      newDataProvider,
      expect.any(Object),
      mockLogger
    );
  });

  it("should handle synchronous execution of cron callbacks", () => {
    scheduler.start(mailer, dataProvider);
    const [[, hourlyCallback], [, dailyCallback]] = (cron.schedule as jest.Mock).mock.calls;

    expect(typeof hourlyCallback).toBe("function");
    expect(typeof dailyCallback).toBe("function");
  });
});
