import SubscriptionService from "../../../src/services/subscription/SubscriptionService.js";
import type {
  DataProvider,
  SubscriptionInput,
  WeatherServiceClient,
  EmailServiceClient,
} from "../../../src/types.js";
import {
  AlreadySubscribedError,
  InvalidTokenError,
  CityNotFound,
  WeatherServiceError,
  EmailServiceError,
} from "../../../src/errors/SubscriptionError.js";
import type { Logger } from "winston";

describe("SubscriptionService", () => {
  let dataProvider: jest.Mocked<DataProvider>;
  let weatherClient: jest.Mocked<WeatherServiceClient>;
  let emailClient: jest.Mocked<EmailServiceClient>;
  let service: SubscriptionService;
  let mockLogger: jest.Mocked<Logger>;

  const testInput: SubscriptionInput = {
    email: "test@mail.com",
    city: "Kyiv",
    frequency: "daily",
  };

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

    dataProvider = {
      checkSubscriptionExists: jest.fn(),
      insertSubscription: jest.fn(),
      updateSubscriptionStatus: jest.fn(),
      deleteSubscription: jest.fn(),
      getSubscriptionsByFrequency: jest.fn(),
    } as any;

    weatherClient = {
      getWeatherData: jest.fn(),
    } as any;

    emailClient = {
      sendConfirmationEmail: jest.fn().mockResolvedValue(undefined),
      sendWeatherEmail: jest.fn().mockResolvedValue(undefined),
    } as any;

    service = new SubscriptionService(
      dataProvider,
      weatherClient,
      emailClient,
      mockLogger,
    );
  });

  describe("subscribe", () => {
    it("should subscribe and send confirmation email", async () => {
      dataProvider.checkSubscriptionExists.mockResolvedValue(false);
      dataProvider.insertSubscription.mockResolvedValue(undefined);
      weatherClient.getWeatherData.mockResolvedValue(mockWeatherData);

      const result = await service.subscribe(testInput);

      expect(dataProvider.checkSubscriptionExists).toHaveBeenCalledWith(
        testInput,
      );
      expect(weatherClient.getWeatherData).toHaveBeenCalledWith(testInput.city);
      expect(dataProvider.insertSubscription).toHaveBeenCalledWith(
        testInput,
        expect.any(String),
        false,
      );
      expect(emailClient.sendConfirmationEmail).toHaveBeenCalledWith(
        testInput.email,
        testInput.city,
        expect.any(String),
      );
      expect(result).toEqual({ token: expect.any(String) });
    });

    it("should throw AlreadySubscribedError when subscription exists", async () => {
      dataProvider.checkSubscriptionExists.mockResolvedValue(true);

      await expect(service.subscribe(testInput)).rejects.toThrow(
        AlreadySubscribedError,
      );
      expect(dataProvider.insertSubscription).not.toHaveBeenCalled();
      expect(emailClient.sendConfirmationEmail).not.toHaveBeenCalled();
    });

    it("should throw WeatherServiceError when weather service returns null", async () => {
      dataProvider.checkSubscriptionExists.mockResolvedValue(false);
      weatherClient.getWeatherData.mockResolvedValue(null);

      await expect(service.subscribe(testInput)).rejects.toThrow(
        WeatherServiceError,
      );
      expect(dataProvider.insertSubscription).not.toHaveBeenCalled();
      expect(emailClient.sendConfirmationEmail).not.toHaveBeenCalled();
    });

    it("should throw WeatherServiceError when weather service fails", async () => {
      dataProvider.checkSubscriptionExists.mockResolvedValue(false);
      weatherClient.getWeatherData.mockRejectedValue(
        new Error("Weather API error"),
      );

      await expect(service.subscribe(testInput)).rejects.toThrow(
        WeatherServiceError,
      );
      expect(dataProvider.insertSubscription).not.toHaveBeenCalled();
      expect(emailClient.sendConfirmationEmail).not.toHaveBeenCalled();
    });

    it("should throw EmailServiceError when email sending fails", async () => {
      dataProvider.checkSubscriptionExists.mockResolvedValue(false);
      weatherClient.getWeatherData.mockResolvedValue(mockWeatherData);
      dataProvider.insertSubscription.mockResolvedValue(undefined);
      emailClient.sendConfirmationEmail.mockRejectedValue(
        new Error("email service error"),
      );

      await expect(service.subscribe(testInput)).rejects.toThrow(
        EmailServiceError,
      );
      expect(dataProvider.insertSubscription).toHaveBeenCalled();
    });

    it("should throw generic error when database insertion fails", async () => {
      dataProvider.checkSubscriptionExists.mockResolvedValue(false);
      weatherClient.getWeatherData.mockResolvedValue(mockWeatherData);
      dataProvider.insertSubscription.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(service.subscribe(testInput)).rejects.toThrow(
        "Failed to create subscription",
      );
      expect(emailClient.sendConfirmationEmail).not.toHaveBeenCalled();
    });
  });

  describe("confirm", () => {
    const testToken = "test-token-123";

    it("should confirm subscription with valid token", async () => {
      dataProvider.updateSubscriptionStatus.mockResolvedValue(true);

      const result = await service.confirm(testToken);

      expect(dataProvider.updateSubscriptionStatus).toHaveBeenCalledWith(
        testToken,
        true,
      );
      expect(result).toBe(true);
    });

    it("should throw InvalidTokenError when token is invalid", async () => {
      dataProvider.updateSubscriptionStatus.mockResolvedValue(false);

      await expect(service.confirm(testToken)).rejects.toThrow(
        InvalidTokenError,
      );
    });

    it("should throw error when database update fails", async () => {
      dataProvider.updateSubscriptionStatus.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(service.confirm(testToken)).rejects.toThrow(
        "Failed to confirm subscription",
      );
    });
  });

  describe("unsubscribe", () => {
    const testToken = "test-token-123";

    it("should unsubscribe with valid token", async () => {
      dataProvider.deleteSubscription.mockResolvedValue(true);

      const result = await service.unsubscribe(testToken);

      expect(dataProvider.deleteSubscription).toHaveBeenCalledWith(testToken);
      expect(result).toBe(true);
    });

    it("should throw InvalidTokenError when token is invalid", async () => {
      dataProvider.deleteSubscription.mockResolvedValue(false);

      await expect(service.unsubscribe(testToken)).rejects.toThrow(
        InvalidTokenError,
      );
    });

    it("should throw error when database deletion fails", async () => {
      dataProvider.deleteSubscription.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(service.unsubscribe(testToken)).rejects.toThrow(
        "Failed to unsubscribe",
      );
    });
  });

  describe("getSubscriptionsByFrequency", () => {
    const mockSubscriptions = [
      {
        id: 1,
        email: "test1@mail.com",
        city: "Kyiv",
        token: "token1",
        is_active: true,
        frequency: "daily" as const,
      },
      {
        id: 2,
        email: "test2@mail.com",
        city: "Prague",
        token: "token2",
        is_active: true,
        frequency: "daily" as const,
      },
    ];

    it("should return subscriptions by frequency", async () => {
      dataProvider.getSubscriptionsByFrequency.mockResolvedValue(
        mockSubscriptions,
      );

      const result = await service.getSubscriptionsByFrequency("daily");

      expect(dataProvider.getSubscriptionsByFrequency).toHaveBeenCalledWith(
        "daily",
      );
      expect(result).toEqual(mockSubscriptions);
    });

    it("should throw error when database query fails", async () => {
      dataProvider.getSubscriptionsByFrequency.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        service.getSubscriptionsByFrequency("daily"),
      ).rejects.toThrow("Failed to get subscriptions");
    });
  });
});
