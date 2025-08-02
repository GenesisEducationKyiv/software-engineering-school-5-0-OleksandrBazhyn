import { SubscriptionService } from "../../../src/services/subscription/SubscriptionService.js";
import { SubscriptionInput } from "../../../src/types.js";
import { WeatherGrpcClient } from "../../../src/clients/WeatherGrpcClient.js";
import { EmailServiceClient } from "../../../src/clients/EmailServiceClient.js";
import { AlreadySubscribedError, InvalidTokenError } from "../../../src/errors/SubscriptionError.js";

// Mock only external service clients (I/O boundaries)
jest.mock("../../../src/clients/WeatherGrpcClient.js");
jest.mock("../../../src/clients/EmailServiceClient.js");

// Mock the data provider - but use real implementation in integration tests
const mockDataProvider = {
  checkSubscriptionExists: jest.fn(),
  insertSubscription: jest.fn(),
  updateSubscriptionStatus: jest.fn(),
  deleteSubscription: jest.fn(),
  getActiveSubscriptions: jest.fn(),
};

describe("SubscriptionService", () => {
  let service: SubscriptionService;
  let mockWeatherClient: jest.Mocked<WeatherGrpcClient>;
  let mockEmailClient: jest.Mocked<EmailServiceClient>;

  const testInput: SubscriptionInput = {
    email: "test@mail.com",
    city: "Kyiv",
    frequency: "daily",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mocked instances
    mockWeatherClient = new WeatherGrpcClient() as jest.Mocked<WeatherGrpcClient>;
    mockEmailClient = new EmailServiceClient() as jest.Mocked<EmailServiceClient>;

    // Setup default behaviors
    mockWeatherClient.healthCheck = jest.fn().mockResolvedValue(true);
    mockEmailClient.sendEmail = jest.fn().mockResolvedValue(true);
    mockEmailClient.healthCheck = jest.fn().mockResolvedValue(true);

    service = new SubscriptionService(
      mockDataProvider as any,
      mockWeatherClient,
      mockEmailClient
    );
  });

  describe("subscribe", () => {
    it("should create subscription when user doesn't exist", async () => {
      // Arrange
      mockDataProvider.checkSubscriptionExists.mockResolvedValue(false);
      mockDataProvider.insertSubscription.mockResolvedValue(undefined);

      // Act
      const result = await service.subscribe(testInput);

      // Assert
      expect(mockDataProvider.checkSubscriptionExists).toHaveBeenCalledWith(testInput);
      expect(mockDataProvider.insertSubscription).toHaveBeenCalledWith(
        testInput,
        expect.any(String),
        false
      );
      expect(mockEmailClient.sendEmail).toHaveBeenCalledWith({
        to: testInput.email,
        subject: expect.stringContaining("Confirm"),
        type: "confirmation",
        data: {
          confirmationLink: expect.stringContaining("confirm/")
        }
      });
      expect(result.token).toBeDefined();
    });

    it("should throw AlreadySubscribedError when user exists", async () => {
      // Arrange
      mockDataProvider.checkSubscriptionExists.mockResolvedValue(true);

      // Act & Assert
      await expect(service.subscribe(testInput))
        .rejects
        .toThrow(AlreadySubscribedError);
      
      expect(mockDataProvider.insertSubscription).not.toHaveBeenCalled();
      expect(mockEmailClient.sendEmail).not.toHaveBeenCalled();
    });

    it("should handle email service failure gracefully", async () => {
      // Arrange
      mockDataProvider.checkSubscriptionExists.mockResolvedValue(false);
      mockDataProvider.insertSubscription.mockResolvedValue(undefined);
      mockEmailClient.sendEmail.mockResolvedValue(false);

      // Act & Assert
      const result = await service.subscribe(testInput);
      
      // Should still return token even if email fails
      expect(result.token).toBeDefined();
    });
  });

  describe("confirm", () => {
    it("should confirm valid token", async () => {
      // Arrange
      mockDataProvider.updateSubscriptionStatus.mockResolvedValue(true);

      // Act
      const result = await service.confirm("valid-token");

      // Assert
      expect(result).toBe(true);
      expect(mockDataProvider.updateSubscriptionStatus).toHaveBeenCalledWith("valid-token", true);
    });

    it("should throw InvalidTokenError for invalid token", async () => {
      // Arrange
      mockDataProvider.updateSubscriptionStatus.mockResolvedValue(false);

      // Act & Assert
      await expect(service.confirm("invalid-token"))
        .rejects
        .toThrow(InvalidTokenError);
    });
  });

  describe("unsubscribe", () => {
    it("should unsubscribe valid token", async () => {
      // Arrange
      mockDataProvider.deleteSubscription.mockResolvedValue(true);

      // Act
      const result = await service.unsubscribe("valid-token");

      // Assert
      expect(result).toBe(true);
      expect(mockDataProvider.deleteSubscription).toHaveBeenCalledWith("valid-token");
    });

    it("should throw InvalidTokenError for invalid token", async () => {
      // Arrange
      mockDataProvider.deleteSubscription.mockResolvedValue(false);

      // Act & Assert
      await expect(service.unsubscribe("invalid-token"))
        .rejects
        .toThrow(InvalidTokenError);
    });
  });
});
