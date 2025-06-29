import cron from "node-cron";
import Scheduler from "../../../src/entities/Scheduler.js";
import EmailService from "../../../src/entities/EmailService.js";
import { Mailer, DataProvider } from "../../../src/types.js";

jest.mock("node-cron");
jest.mock("../../../src/entities/EmailService");

describe("Scheduler", () => {
  let mailer: Mailer;
  let dataProvider: DataProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    mailer = {} as Mailer;
    dataProvider = {} as DataProvider;
  });
  it("should schedule hourly and daily jobs with correct cron expressions", () => {
    Scheduler.start(mailer, dataProvider);

    expect(cron.schedule).toHaveBeenCalledWith("0 * * * *", expect.any(Function));
    expect(cron.schedule).toHaveBeenCalledWith("0 8 * * *", expect.any(Function));
    expect(EmailService as jest.Mock).toHaveBeenCalledWith(mailer, dataProvider);
  });

  it("hourly job should call sendWeatherEmailsByFrequency('hourly') and log", async () => {
    Scheduler.start(mailer, dataProvider);
    const [[, hourlyCallback]] = (cron.schedule as jest.Mock).mock.calls;
    const emailServiceInstance = (EmailService as jest.Mock).mock.instances[0];
    emailServiceInstance.sendWeatherEmailsByFrequency = jest.fn().mockResolvedValue(undefined);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    await hourlyCallback();

    expect(emailServiceInstance.sendWeatherEmailsByFrequency).toHaveBeenCalledWith("hourly");
    expect(logSpy).toHaveBeenCalledWith("Hourly weather emails sent.");

    logSpy.mockRestore();
  });

  it("daily job should call sendWeatherEmailsByFrequency('daily') and log", async () => {
    Scheduler.start(mailer, dataProvider);
    const [[,], [, dailyCallback]] = (cron.schedule as jest.Mock).mock.calls;
    const emailServiceInstance = (EmailService as jest.Mock).mock.instances[0];
    emailServiceInstance.sendWeatherEmailsByFrequency = jest.fn().mockResolvedValue(undefined);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    await dailyCallback();

    expect(emailServiceInstance.sendWeatherEmailsByFrequency).toHaveBeenCalledWith("daily");
    expect(logSpy).toHaveBeenCalledWith("Daily weather emails sent.");

    logSpy.mockRestore();
  });
});
