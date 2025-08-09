import { EmailService } from "../../src/services/emailService.js";
import { Logger } from "winston";
import { WeatherData } from "../../src/types.js";
import { HtmlRender } from "../../src/services/htmlRender.js";

const mockSendMail = jest.fn();
const mockLogger: Partial<Logger> = {
  info: jest.fn(),
  error: jest.fn(),
};

describe("EmailService", () => {
  let emailService: EmailService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(HtmlRender.prototype, "render").mockImplementation(mockRender);
    emailService = new EmailService(
      mockLogger as Logger,
      { sendMail: mockSendMail } as any,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("sendConfirmationEmail", () => {
    it("should render template and send mail with correct params", async () => {
      mockRender.mockResolvedValue("<html>confirmation</html>");
      await emailService.sendConfirmationEmail(
        "test@example.com",
        "Kyiv",
        "http://confirm",
      );
      expect(mockRender).toHaveBeenCalledWith("confirmation", {
        city: "Kyiv",
        confirmUrl: "http://confirm",
      });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: expect.stringContaining("Kyiv"),
          html: "<html>confirmation</html>",
        }),
      );
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe("sendWeatherEmail", () => {
    it("should render template and send mail with correct params", async () => {
      mockRender.mockResolvedValue("<html>weather</html>");
      const weatherData: WeatherData = {
        city: "Lviv",
        temperature: 20,
        humidity: 50,
        description: "Sunny",
      };
      await emailService.sendWeatherEmail(
        "test@example.com",
        weatherData,
        "http://unsub",
      );
      expect(mockRender).toHaveBeenCalledWith("weather", {
        ...weatherData,
        unsubscribeUrl: "http://unsub",
      });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: expect.stringContaining("Lviv"),
          html: "<html>weather</html>",
        }),
      );
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });
});

const mockRender = jest.fn();
