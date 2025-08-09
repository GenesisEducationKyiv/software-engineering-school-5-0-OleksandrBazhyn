import smtpTester from "smtp-tester";
import nodemailer from "nodemailer";
import { EmailService } from "../../src/services/emailService.js";
import { Logger } from "winston";
import { WeatherData } from "../../src/types.js";

const SMTP_PORT = 2525;

describe("EmailService integration", () => {
  let smtpServer: any;
  let received: any[] = [];
  let emailService: EmailService;

  beforeAll((done) => {
    smtpServer = smtpTester.init(SMTP_PORT);
    smtpServer.bind((addr: any, id: any, email: any) => {
      received.push(email);
    });
    done();
  });

  afterAll((done) => {
    smtpServer.stop(done);
  });

  beforeEach(() => {
    received = [];
    const transporter = nodemailer.createTransport({
      host: "localhost",
      port: SMTP_PORT,
      secure: false,
      tls: { rejectUnauthorized: false },
    });
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;
    emailService = new EmailService(mockLogger, transporter);
  });

  it("should send confirmation email via SMTP", async () => {
    await emailService.sendConfirmationEmail(
      "test@integration.com",
      "Dnipro",
      "http://confirm-link",
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(received.length).toBe(1);
    expect(received[0].headers.to).toBe("test@integration.com");
    expect(received[0].headers.subject).toContain("Dnipro");
    expect(received[0].body).toContain("confirm your subscription");
    expect(received[0].body).toContain("Dnipro");
  });

  it("should send weather email via SMTP", async () => {
    const weatherData: WeatherData = {
      city: "Odesa",
      temperature: 25,
      humidity: 60,
      description: "Clear",
    };
    await emailService.sendWeatherEmail(
      "weather@integration.com",
      weatherData,
      "http://unsub-link",
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(received.length).toBe(1);
    expect(received[0].headers.to).toBe("weather@integration.com");
    expect(received[0].headers.subject).toContain("Odesa");
    expect(received[0].body).toContain("weather");
    expect(received[0].body).toContain("Odesa");
  });
});
