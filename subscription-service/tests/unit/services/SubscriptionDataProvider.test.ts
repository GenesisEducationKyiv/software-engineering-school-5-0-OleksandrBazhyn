import SubscriptionDataProvider from "../../../src/services/subscription/SubscriptionDataProvider.js";
import db from "../../../db/knex.js";
import type { SubscriptionInput, Subscription } from "../../../src/types.js";

// Interface for the mocked knex object
interface MockKnex {
  where: jest.Mock;
  andWhere?: jest.Mock;
  first?: jest.Mock;
  insert?: jest.Mock;
  update?: jest.Mock;
  del?: jest.Mock;
}

jest.mock("../../../db/knex.js");

describe("SubscriptionDataProvider", () => {
  let dataProvider: SubscriptionDataProvider;

  const testSubscription: SubscriptionInput = {
    email: "test@mail.com",
    city: "Kyiv",
    frequency: "daily",
  };
  const testToken = "test-token";

  beforeEach(() => {
    dataProvider = new SubscriptionDataProvider();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("getSubscriptionsByFrequency", () => {
    it("returns subscriptions for given frequency", async () => {
      const mockSubs: Subscription[] = [
        {
          id: 1,
          email: "a@mail.com",
          city: "Kyiv",
          token: "t1",
          is_active: true,
          frequency: "daily",
        },
      ];
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockResolvedValue(mockSubs),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);

      const result = await dataProvider.getSubscriptionsByFrequency("daily");
      expect(result).toEqual(mockSubs);
      expect(db).toHaveBeenCalledWith("subscriptions");
      expect(mockKnex.where).toHaveBeenCalledWith("frequency", "daily");
      expect(mockKnex.andWhere).toHaveBeenCalledWith("is_active", true);
    });

    it("returns empty array when no subscriptions found", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockResolvedValue([]),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);

      const result = await dataProvider.getSubscriptionsByFrequency("hourly");
      expect(result).toEqual([]);
    });
  });

  describe("checkSubscriptionExists", () => {
    it("returns true when subscription exists", async () => {
      const mockSub: Subscription = {
        id: 1,
        email: "test@mail.com",
        city: "Kyiv",
        token: "token",
        is_active: true,
        frequency: "daily",
      };
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockSub),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);

      const result =
        await dataProvider.checkSubscriptionExists(testSubscription);
      expect(result).toBe(true);
      expect(db).toHaveBeenCalledWith("subscriptions");
      expect(mockKnex.where).toHaveBeenCalledWith(
        "email",
        testSubscription.email,
      );
      expect(mockKnex.andWhere).toHaveBeenCalledWith(
        "city",
        testSubscription.city,
      );
      expect(mockKnex.andWhere).toHaveBeenCalledWith(
        "frequency",
        testSubscription.frequency,
      );
    });

    it("returns false when subscription does not exist", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(undefined),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);

      const result =
        await dataProvider.checkSubscriptionExists(testSubscription);
      expect(result).toBe(false);
    });
  });

  describe("insertSubscription", () => {
    it("inserts subscription successfully", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn(),
        insert: jest.fn().mockResolvedValue(undefined),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);

      await dataProvider.insertSubscription(testSubscription, testToken, false);

      expect(db).toHaveBeenCalledWith("subscriptions");
      expect(mockKnex.insert).toHaveBeenCalledWith({
        email: testSubscription.email,
        city: testSubscription.city,
        frequency: testSubscription.frequency,
        token: testToken,
        is_active: false,
      });
    });

    it("inserts subscription with active status", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn(),
        insert: jest.fn().mockResolvedValue(undefined),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);

      await dataProvider.insertSubscription(testSubscription, testToken, true);

      expect(mockKnex.insert).toHaveBeenCalledWith({
        email: testSubscription.email,
        city: testSubscription.city,
        frequency: testSubscription.frequency,
        token: testToken,
        is_active: true,
      });
    });
  });

  describe("updateSubscriptionStatus", () => {
    it("updates subscription status successfully", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);

      const result = await dataProvider.updateSubscriptionStatus(
        testToken,
        true,
      );

      expect(result).toBe(true);
      expect(db).toHaveBeenCalledWith("subscriptions");
      expect(mockKnex.where).toHaveBeenCalledWith("token", testToken);
      expect(mockKnex.update).toHaveBeenCalledWith({
        is_active: true,
        updated_at: expect.any(String),
      });
    });

    it("returns false when no subscription found", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(0),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);

      const result = await dataProvider.updateSubscriptionStatus(
        testToken,
        true,
      );

      expect(result).toBe(false);
    });
  });

  describe("deleteSubscription", () => {
    it("deletes subscription successfully", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        del: jest.fn().mockResolvedValue(1),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);

      const result = await dataProvider.deleteSubscription(testToken);

      expect(result).toBe(true);
      expect(db).toHaveBeenCalledWith("subscriptions");
      expect(mockKnex.where).toHaveBeenCalledWith("token", testToken);
      expect(mockKnex.del).toHaveBeenCalled();
    });

    it("returns false when no subscription found", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        del: jest.fn().mockResolvedValue(0),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);

      const result = await dataProvider.deleteSubscription(testToken);

      expect(result).toBe(false);
    });
  });
});
