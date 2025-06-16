import DbDataProvider from "../../../src/managers/DbDataProvider.js";
import db from "../../../db/knex.js";
import { SubscriptionInput, Subscription } from "../../../src/types.js";

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

describe("DbDataProvider", () => {
  const testSubscription: SubscriptionInput = {
    email: "test@mail.com",
    city: "Kyiv",
    frequency: "daily",
  };
  const testToken = "test-token";

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

      const result = await DbDataProvider.getSubscriptionsByFrequency("daily");
      expect(result).toEqual(mockSubs);
    });

    it("warns and returns empty array if no subscriptions found", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockResolvedValue([]),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);

      const result = await DbDataProvider.getSubscriptionsByFrequency("hourly");
      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith("No active subscriptions found for frequency: hourly");
      warnSpy.mockRestore();
    });

    it("throws if frequency is invalid", async () => {
      (db as unknown as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid frequency");
      });
      await expect(DbDataProvider.getSubscriptionsByFrequency("weekly" as any)).rejects.toThrow(
        "Invalid frequency",
      );
    });
  });

  describe("checkSubscriptionExists", () => {
    it("returns true and warns if subscription exists", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        first: jest
          .fn()
          .mockResolvedValue({ ...testSubscription, id: 1, token: testToken, is_active: true }),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);

      const result = await DbDataProvider.checkSubscriptionExists(testSubscription);
      expect(result).toBe(true);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("returns false if subscription does not exist", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(undefined),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);

      const result = await DbDataProvider.checkSubscriptionExists(testSubscription);
      expect(result).toBe(false);
    });
  });

  describe("insertSubscription", () => {
    it("inserts subscription successfully", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue(undefined),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        DbDataProvider.insertSubscription(testSubscription, testToken, false),
      ).resolves.toBeUndefined();

      expect(logSpy).toHaveBeenCalledWith(
        "Inserting subscription into database:",
        testSubscription,
      );
      logSpy.mockRestore();
    });

    it("throws error if insert fails", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        insert: jest.fn().mockRejectedValue(new Error("fail")),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);
      const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      await expect(
        DbDataProvider.insertSubscription(testSubscription, testToken, false),
      ).rejects.toThrow("Failed to insert subscription");

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("throws error if required fields are missing", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        insert: jest.fn().mockRejectedValue(new Error("not null violation")),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);
      await expect(
        DbDataProvider.insertSubscription(
          { email: "", city: "", frequency: "daily" },
          testToken,
          false,
        ),
      ).rejects.toThrow("Failed to insert subscription");
    });
  });

  describe("updateSubscriptionStatus", () => {
    it("returns true and logs if update succeeds", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      const result = await DbDataProvider.updateSubscriptionStatus(testToken, true);
      expect(result).toBe(true);
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it("returns false and warns if no rows updated", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(0),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      const result = await DbDataProvider.updateSubscriptionStatus(testToken, true);
      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(`No subscription found with token: ${testToken}`);
      warnSpy.mockRestore();
    });

    it("throws error if update fails", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockRejectedValue(new Error("update error")),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);
      await expect(DbDataProvider.updateSubscriptionStatus(testToken, true)).rejects.toThrow();
    });
  });

  describe("deleteSubscription", () => {
    it("returns true and logs if delete succeeds", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        del: jest.fn().mockResolvedValue(1),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      const result = await DbDataProvider.deleteSubscription(testToken);
      expect(result).toBe(true);
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it("returns false and warns if no rows deleted", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        del: jest.fn().mockResolvedValue(0),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      const result = await DbDataProvider.deleteSubscription(testToken);
      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(`No subscription found with token: ${testToken}`);
      warnSpy.mockRestore();
    });

    it("throws error if delete fails", async () => {
      const mockKnex: MockKnex = {
        where: jest.fn().mockReturnThis(),
        del: jest.fn().mockRejectedValue(new Error("delete error")),
      };
      (db as unknown as jest.Mock).mockReturnValueOnce(mockKnex);
      await expect(DbDataProvider.deleteSubscription(testToken)).rejects.toThrow();
    });
  });
});
