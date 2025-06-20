import nodemailer from "nodemailer";
import GmailMailer from "../../../src/entities/GmailMailer.js";
import { WeatherData } from "../../../src/types.js";

jest.mock("nodemailer");

describe("GmailMailer", () => {
  const OLD_ENV = process.env;
  let sendMailMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, SMTP_USER: "user", SMTP_PASS: "pass", SMTP_FROM: "from@mail.com" };
    sendMailMock = jest.fn().mockResolvedValue({});
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: sendMailMock });
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  it("should warn if SMTP_USER or SMTP_PASS is missing", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    process.env.SMTP_USER = "";
    process.env.SMTP_PASS = "";
    new GmailMailer();
    expect(warnSpy).toHaveBeenCalledWith(
      "SMTP_USER or SMTP_PASS is not set in environment variables.",
    );
    warnSpy.mockRestore();
  });

  it("should create transporter with correct config", () => {
    new GmailMailer();
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      service: "gmail",
      auth: { user: "user", pass: "pass" },
    });
  });

  it("should send confirmation email with correct params", async () => {
    const mailer = new GmailMailer();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await mailer.sendConfirmationEmail("to@mail.com", "Kyiv", "token123");
    expect(logSpy).toHaveBeenCalledWith("Sending confirmation email to:", "to@mail.com");
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "from@mail.com",
        to: "to@mail.com",
        subject: "Confirm your subscription",
        html: expect.stringContaining("confirm your subscription for Kyiv"),
      }),
    );
    logSpy.mockRestore();
  });

  it("should send weather email with correct params", async () => {
    const mailer = new GmailMailer();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const weather: WeatherData = {
      current: { temp_c: 10, humidity: 80, condition: { text: "Rainy" } },
    };
    await mailer.sendWeatherEmail("to@mail.com", "Lviv", weather, "token456");
    expect(logSpy).toHaveBeenCalledWith("Sending weather email to:", "to@mail.com");
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "from@mail.com",
        to: "to@mail.com",
        subject: "Weather update for Lviv",
        html: expect.stringContaining("Weather in Lviv:"),
      }),
    );
    logSpy.mockRestore();
  });

  it("should throw if sendMail fails", async () => {
    sendMailMock.mockRejectedValueOnce(new Error("fail"));
    const mailer = new GmailMailer();
    await expect(
      mailer.sendWeatherEmail(
        "to@mail.com",
        "Kyiv",
        {
          current: { temp_c: 1, humidity: 2, condition: { text: "Cloudy" } },
        },
        "token789",
      ),
    ).rejects.toThrow("fail");
  });
});
