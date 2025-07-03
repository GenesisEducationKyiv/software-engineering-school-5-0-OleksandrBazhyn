import SubscriptionService from "../../../src/entities/SubscriptionService.js";
import { Mailer, DataProvider, SubscriptionInput } from "../../../src/types.js";

describe("SubscriptionService", () => {
  let mailer: jest.Mocked<Mailer>;
  let dataProvider: jest.Mocked<DataProvider>;
  let service: SubscriptionService;
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  } as any;
  const testInput: SubscriptionInput = {
    email: "test@mail.com",
    city: "Kyiv",
    frequency: "daily",
  };

  beforeEach(() => {
    mailer = {
      sendConfirmationEmail: jest.fn().mockResolvedValue(undefined),
    } as any;
    dataProvider = {
      checkSubscriptionExists: jest.fn(),
      insertSubscription: jest.fn(),
      updateSubscriptionStatus: jest.fn(),
      deleteSubscription: jest.fn(),
    } as any;
    service = new SubscriptionService(mailer, dataProvider, mockLogger);
  });

  describe("subscribe", () => {
    it("should subscribe and send confirmation email", async () => {
      dataProvider.checkSubscriptionExists.mockResolvedValue(false);
      dataProvider.insertSubscription.mockResolvedValue(undefined);

      const result = await service.subscribe(testInput);

      expect(dataProvider.checkSubscriptionExists).toHaveBeenCalledWith(testInput);
      expect(dataProvider.insertSubscription).toHaveBeenCalledWith(
        testInput,
        expect.any(String),
        false,
      );
      expect(mailer.sendConfirmationEmail).toHaveBeenCalledWith(
        testInput.email,
        testInput.city,
        expect.any(String),
      );
      expect(result).toHaveProperty("token");
      expect(typeof result.token).toBe("string");
    });

    it("should throw if already subscribed", async () => {
      dataProvider.checkSubscriptionExists.mockResolvedValue(true);

      await expect(service.subscribe(testInput)).rejects.toThrow("Email already subscribed");
      expect(dataProvider.insertSubscription).not.toHaveBeenCalled();
      expect(mailer.sendConfirmationEmail).not.toHaveBeenCalled();
    });

    it("should throw if insertSubscription fails", async () => {
      dataProvider.checkSubscriptionExists.mockResolvedValue(false);
      dataProvider.insertSubscription.mockRejectedValue(new Error("DB error"));

      await expect(service.subscribe(testInput)).rejects.toThrow("Failed to subscribe");
      expect(mailer.sendConfirmationEmail).not.toHaveBeenCalled();
    });

    it("should throw if sendConfirmationEmail fails", async () => {
      dataProvider.checkSubscriptionExists.mockResolvedValue(false);
      dataProvider.insertSubscription.mockResolvedValue(undefined);
      mailer.sendConfirmationEmail.mockRejectedValue(new Error("Mail error"));

      await expect(service.subscribe(testInput)).rejects.toThrow("Failed to subscribe");
    });
  });

  describe("confirm", () => {
    it("should confirm subscription by token", async () => {
      dataProvider.updateSubscriptionStatus.mockResolvedValue(true);

      const result = await service.confirm("token123");

      expect(dataProvider.updateSubscriptionStatus).toHaveBeenCalledWith("token123", true);
      expect(result).toBe(true);
    });

    it("should throw if token is invalid or already confirmed", async () => {
      dataProvider.updateSubscriptionStatus.mockResolvedValue(false);

      await expect(service.confirm("badtoken")).rejects.toThrow(
        "Invalid token",
      );
    });

    it("should propagate DB errors", async () => {
      dataProvider.updateSubscriptionStatus.mockRejectedValue(new Error("DB error"));

      await expect(service.confirm("token123")).rejects.toThrow("DB error");
    });
  });

  describe("unsubscribe", () => {
    it("should unsubscribe by token", async () => {
      dataProvider.deleteSubscription.mockResolvedValue(true);

      const result = await service.unsubscribe("token123");

      expect(dataProvider.deleteSubscription).toHaveBeenCalledWith("token123");
      expect(result).toBe(true);
    });

    it("should throw if token is invalid or not found", async () => {
      dataProvider.deleteSubscription.mockResolvedValue(false);

      await expect(service.unsubscribe("badtoken")).rejects.toThrow(
        "Invalid token",
      );
    });

    it("should propagate DB errors", async () => {
      dataProvider.deleteSubscription.mockRejectedValue(new Error("DB error"));

      await expect(service.unsubscribe("token123")).rejects.toThrow("DB error");
    });
  });
});
