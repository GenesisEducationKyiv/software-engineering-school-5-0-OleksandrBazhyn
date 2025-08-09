import nodemailer from "nodemailer";
import MailManager from "../../../src/services/email/MailManager.js";
import { WeatherData } from "../../../src/types.js";
import { config } from "../../../src/config.js";

describe("MailManager", () => {
  let sendMailMock: jest.Mock;
  let mockTransporter: nodemailer.Transporter;
  let mockLogger: any;

  beforeEach(() => {
    sendMailMock = jest.fn().mockResolvedValue({});
    mockTransporter = {
      sendMail: sendMailMock,
    } as unknown as nodemailer.Transporter;
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should send confirmation email with correct params", async () => {
    const mailer = new MailManager(mockTransporter, mockLogger);

    await mailer.sendConfirmationEmail("to@mail.com", "Kyiv", "token123");

    expect(mockLogger.info).toHaveBeenCalledWith(
      "Sending confirmation email to: to@mail.com",
    );
    expect(sendMailMock).toHaveBeenCalledWith({
      from: config.SMTP_FROM,
      to: "to@mail.com",
      subject: "Confirm your subscription",
      html: expect.stringContaining("confirm your subscription for Kyiv"),
    });
  });

  it("should send weather email with correct params", async () => {
    const mailer = new MailManager(mockTransporter, mockLogger);
    const weather: WeatherData = {
      current: { temp_c: 10, humidity: 80, condition: { text: "Rainy" } },
    };

    await mailer.sendWeatherEmail("to@mail.com", "Lviv", weather, "token456");

    expect(mockLogger.info).toHaveBeenCalledWith(
      "Sending weather email to: to@mail.com for city: Lviv",
    );
    expect(sendMailMock).toHaveBeenCalledWith({
      from: config.SMTP_FROM,
      to: "to@mail.com",
      subject: "Weather update for Lviv",
      html: expect.stringContaining("Weather in Lviv:"),
    });
  });

  it("should throw if sendMail fails", async () => {
    sendMailMock.mockRejectedValueOnce(new Error("fail"));
    const mailer = new MailManager(mockTransporter, mockLogger);

    await expect(
      mailer.sendWeatherEmail(
        "to@mail.com",
        "Kyiv",
        { current: { temp_c: 1, humidity: 2, condition: { text: "Cloudy" } } },
        "token789",
      ),
    ).rejects.toThrow("fail");
  });
});
