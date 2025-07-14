import SchedulerService from "../../../src/services/scheduler/SchedulerService.js";
import type {
  WeatherServiceClient,
  EmailServiceClient,
  SubscriptionServiceInterface,
} from "../../../src/types.js";
import type { Logger } from "winston";

// Mock node-cron
jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));

describe("SchedulerService", () => {
  let schedulerService: SchedulerService;
  let mockSubscriptionService: jest.Mocked<SubscriptionServiceInterface>;
  let mockWeatherClient: jest.Mocked<WeatherServiceClient>;
  let mockEmailClient: jest.Mocked<EmailServiceClient>;
  let mockLogger: jest.Mocked<Logger>;

  const mockSubscriptions = [
    {
      id: 1,
      email: "test1@mail.com",
      city: "Prague",
      token: "token1",
      is_active: true,
      frequency: "daily" as const,
    },
    {
      id: 2,
      email: "test2@mail.com",
      city: "Kyiv",
      token: "token2",
      is_active: true,
      frequency: "daily" as const,
    },
  ];

  const mockWeatherData = {
    current: {
      temp_c: 25.5,
      humidity: 60,
      condition: { text: "Sunny" },
    },
  };

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    mockSubscriptionService = {
      subscribe: jest.fn(),
      confirm: jest.fn(),
      unsubscribe: jest.fn(),
      getSubscriptionsByFrequency: jest.fn(),
    } as any;

    mockWeatherClient = {
      getWeatherData: jest.fn(),
    } as any;

    mockEmailClient = {
      sendConfirmationEmail: jest.fn(),
      sendWeatherEmail: jest.fn(),
    } as any;

    schedulerService = new SchedulerService(
      mockSubscriptionService,
      mockWeatherClient,
      mockEmailClient,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("start", () => {
    it("should start scheduler with cron jobs", () => {
      const cron = require("node-cron");
      const mockTask = {
        stop: jest.fn(),
      };
      cron.schedule.mockReturnValue(mockTask);

      schedulerService.start();

      expect(cron.schedule).toHaveBeenCalledTimes(2);
      expect(cron.schedule).toHaveBeenCalledWith(
        "0 * * * *",
        expect.any(Function),
      );
      expect(cron.schedule).toHaveBeenCalledWith(
        "0 8 * * *",
        expect.any(Function),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Starting scheduler service",
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Scheduler service started successfully",
      );
    });
  });

  describe("stop", () => {
    it("should stop scheduler tasks", () => {
      const cron = require("node-cron");
      const mockTask = {
        stop: jest.fn(),
      };
      cron.schedule.mockReturnValue(mockTask);

      schedulerService.start();
      schedulerService.stop();

      expect(mockTask.stop).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Stopping scheduler service",
      );
      expect(mockLogger.info).toHaveBeenCalledWith("Scheduler service stopped");
    });

    it("should handle stop when no tasks are running", () => {
      schedulerService.stop();

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Stopping scheduler service",
      );
      expect(mockLogger.info).toHaveBeenCalledWith("Scheduler service stopped");
    });
  });

  describe("sendWeatherEmailsByFrequency", () => {
    it("should send weather emails for subscriptions", async () => {
      mockSubscriptionService.getSubscriptionsByFrequency.mockResolvedValue(
        mockSubscriptions,
      );
      mockWeatherClient.getWeatherData.mockResolvedValue(mockWeatherData);
      mockEmailClient.sendWeatherEmail.mockResolvedValue(undefined);

      // Отримуємо приватний метод через рефлексію
      const sendWeatherEmailsByFrequency = (schedulerService as any)
        .sendWeatherEmailsByFrequency;
      await sendWeatherEmailsByFrequency.call(schedulerService, "daily");

      expect(
        mockSubscriptionService.getSubscriptionsByFrequency,
      ).toHaveBeenCalledWith("daily");
      expect(mockWeatherClient.getWeatherData).toHaveBeenCalledTimes(2);
      expect(mockWeatherClient.getWeatherData).toHaveBeenCalledWith("Prague");
      expect(mockWeatherClient.getWeatherData).toHaveBeenCalledWith("Kyiv");
      expect(mockEmailClient.sendWeatherEmail).toHaveBeenCalledTimes(2);
    });

    it("should handle no subscriptions", async () => {
      mockSubscriptionService.getSubscriptionsByFrequency.mockResolvedValue([]);

      const sendWeatherEmailsByFrequency = (schedulerService as any)
        .sendWeatherEmailsByFrequency;
      await sendWeatherEmailsByFrequency.call(schedulerService, "daily");

      expect(
        mockSubscriptionService.getSubscriptionsByFrequency,
      ).toHaveBeenCalledWith("daily");
      expect(mockLogger.info).toHaveBeenCalledWith(
        "No active subscriptions for frequency: daily",
      );
      expect(mockWeatherClient.getWeatherData).not.toHaveBeenCalled();
      expect(mockEmailClient.sendWeatherEmail).not.toHaveBeenCalled();
    });

    it("should handle weather service errors", async () => {
      mockSubscriptionService.getSubscriptionsByFrequency.mockResolvedValue(
        mockSubscriptions,
      );
      mockWeatherClient.getWeatherData.mockRejectedValue(
        new Error("Weather service error"),
      );

      const sendWeatherEmailsByFrequency = (schedulerService as any)
        .sendWeatherEmailsByFrequency;
      await sendWeatherEmailsByFrequency.call(schedulerService, "daily");

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to send weather email to test1@mail.com:",
        expect.any(Error),
      );
      expect(mockEmailClient.sendWeatherEmail).not.toHaveBeenCalled();
    });

    it("should handle email service errors", async () => {
      mockSubscriptionService.getSubscriptionsByFrequency.mockResolvedValue(
        mockSubscriptions,
      );
      mockWeatherClient.getWeatherData.mockResolvedValue(mockWeatherData);
      mockEmailClient.sendWeatherEmail.mockRejectedValue(
        new Error("Email service error"),
      );

      const sendWeatherEmailsByFrequency = (schedulerService as any)
        .sendWeatherEmailsByFrequency;
      await sendWeatherEmailsByFrequency.call(schedulerService, "daily");

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to send weather email to test1@mail.com:",
        expect.any(Error),
      );
    });

    it("should handle subscription service errors", async () => {
      mockSubscriptionService.getSubscriptionsByFrequency.mockRejectedValue(
        new Error("Database error"),
      );

      const sendWeatherEmailsByFrequency = (schedulerService as any)
        .sendWeatherEmailsByFrequency;
      await sendWeatherEmailsByFrequency.call(schedulerService, "daily");

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error in sendWeatherEmailsByFrequency(daily):",
        expect.any(Error),
      );
    });
  });
});
