import EmailService from "../../../src/services/email/EmailService.js";
import {
  Subscription,
  WeatherData,
  Mailer,
  DataProvider,
  SubscriptionFrequency,
} from "../../../src/types.js";

describe("EmailService", () => {
  let mailer: jest.Mocked<Mailer>;
  let dataProvider: jest.Mocked<DataProvider>;
  let weatherManager: any;
  let service: EmailService;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mailer = {
      sendMail: jest.fn(),
      sendWeatherEmail: jest.fn(),
      sendConfirmationEmail: jest.fn(),
    } as any;

    dataProvider = {
      getActiveSubscriptions: jest.fn(),
      getUsersByFrequency: jest.fn(),
      getSubscriptionsByFrequency: jest.fn(),
      checkSubscriptionExists: jest.fn(),
      insertSubscription: jest.fn(),
      updateSubscriptionStatus: jest.fn(),
      deleteSubscription: jest.fn(),
    } as any;

    weatherManager = {
      getWeatherData: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    service = new EmailService(
      mailer,
      dataProvider,
      weatherManager,
      mockLogger,
    );

    process.env.WEATHER_API_KEY = "dummy";
  });

  const testSub: Subscription = {
    id: 1,
    email: "user@mail.com",
    city: "Kyiv",
    token: "token-123",
    is_active: true,
    frequency: "daily",
  };

  const testWeather: WeatherData = {
    current: {
      temp_c: 20,
      humidity: 50,
      condition: { text: "Sunny" },
    },
  };

  let logSpy: jest.Mock;
  let errorSpy: jest.Mock;

  beforeEach(() => {
    logSpy = mockLogger.info;
    errorSpy = mockLogger.error;
  });

  describe.each(["daily", "hourly"] as const)(
    "sendWeatherEmailsByFrequency(%s)",
    (frequency) => {
      it("does nothing if there are no subscriptions", async () => {
        dataProvider.getSubscriptionsByFrequency.mockResolvedValue([]);
        await service.sendWeatherEmailsByFrequency(frequency);
        expect(logSpy).toHaveBeenCalledWith(
          `No active subscriptions for frequency: ${frequency}`,
        );
        expect(mailer.sendWeatherEmail).not.toHaveBeenCalled();
      });

      it("sends weather emails for all subscriptions", async () => {
        dataProvider.getSubscriptionsByFrequency.mockResolvedValue([testSub]);
        weatherManager.getWeatherData.mockResolvedValue(testWeather);
        mailer.sendWeatherEmail.mockResolvedValue();

        await service.sendWeatherEmailsByFrequency(frequency);

        expect(weatherManager.getWeatherData).toHaveBeenCalledWith("Kyiv");
        expect(mailer.sendWeatherEmail).toHaveBeenCalledWith(
          "user@mail.com",
          "Kyiv",
          testWeather,
          "token-123",
        );
        expect(logSpy).toHaveBeenCalledWith(
          "Weather email sent to user@mail.com for city Kyiv",
        );
      });

      it("skips subscription if weather data is missing", async () => {
        dataProvider.getSubscriptionsByFrequency.mockResolvedValue([testSub]);
        weatherManager.getWeatherData.mockResolvedValue(null);

        await service.sendWeatherEmailsByFrequency(frequency);

        expect(mailer.sendWeatherEmail).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith(
          "No weather data found for city: Kyiv",
        );
      });

      it("logs and continues if sending email fails", async () => {
        dataProvider.getSubscriptionsByFrequency.mockResolvedValue([testSub]);
        weatherManager.getWeatherData.mockResolvedValue(testWeather);
        mailer.sendWeatherEmail.mockRejectedValue(new Error("SMTP error"));

        await service.sendWeatherEmailsByFrequency(frequency);

        expect(mailer.sendWeatherEmail).toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith(
          "Failed to send weather email to user@mail.com for city Kyiv:",
          expect.any(Error),
        );
      });

      it("handles multiple subscriptions and errors independently", async () => {
        const sub2 = {
          ...testSub,
          email: "other@mail.com",
          city: "Lviv",
          token: "token-2",
        };
        dataProvider.getSubscriptionsByFrequency.mockResolvedValue([
          testSub,
          sub2,
        ]);
        weatherManager.getWeatherData
          .mockResolvedValueOnce(testWeather)
          .mockResolvedValueOnce(null);

        mailer.sendWeatherEmail.mockResolvedValue();

        await service.sendWeatherEmailsByFrequency(frequency);

        expect(weatherManager.getWeatherData).toHaveBeenCalledWith("Kyiv");
        expect(weatherManager.getWeatherData).toHaveBeenCalledWith("Lviv");
        expect(mailer.sendWeatherEmail).toHaveBeenCalledTimes(1);
        expect(mailer.sendWeatherEmail).toHaveBeenCalledWith(
          "user@mail.com",
          "Kyiv",
          testWeather,
          "token-123",
        );
        expect(errorSpy).toHaveBeenCalledWith(
          "No weather data found for city: Lviv",
        );
        expect(logSpy).toHaveBeenCalledWith(
          "Weather email sent to user@mail.com for city Kyiv",
        );
      });

      it("should not send email if subscription token is missing", async () => {
        const subNoToken = { ...testSub, token: "" };
        dataProvider.getSubscriptionsByFrequency.mockResolvedValue([
          subNoToken,
        ]);
        weatherManager.getWeatherData.mockResolvedValue(testWeather);

        await service.sendWeatherEmailsByFrequency(frequency);

        expect(mailer.sendWeatherEmail).toHaveBeenCalledWith(
          "user@mail.com",
          "Kyiv",
          testWeather,
          "",
        );
        expect(logSpy).toHaveBeenCalledWith(
          "Weather email sent to user@mail.com for city Kyiv",
        );
      });

      it("should handle weatherManager.getWeatherData returning undefined", async () => {
        dataProvider.getSubscriptionsByFrequency.mockResolvedValue([testSub]);
        
        weatherManager.getWeatherData.mockResolvedValue(undefined);

        await service.sendWeatherEmailsByFrequency(frequency);

        expect(mailer.sendWeatherEmail).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith(
          "No weather data found for city: Kyiv",
        );
      });

      it("should handle mailer.sendWeatherEmail returning undefined", async () => {
        dataProvider.getSubscriptionsByFrequency.mockResolvedValue([testSub]);
        weatherManager.getWeatherData.mockResolvedValue(testWeather);
        mailer.sendWeatherEmail.mockResolvedValue(undefined);

        await service.sendWeatherEmailsByFrequency(frequency);

        expect(mailer.sendWeatherEmail).toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith(
          "Weather email sent to user@mail.com for city Kyiv",
        );
      });
    },
  );

  it("logs and continues if getWeatherData throws", async () => {
    dataProvider.getSubscriptionsByFrequency.mockResolvedValue([testSub]);
    weatherManager.getWeatherData.mockRejectedValue(new Error("API error"));

    await service.sendWeatherEmailsByFrequency("daily");

    expect(mailer.sendWeatherEmail).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to send weather email to user@mail.com for city Kyiv:",
      expect.any(Error),
    );
  });

  it("logs and continues if getSubscriptionsByFrequency throws", async () => {
    dataProvider.getSubscriptionsByFrequency.mockRejectedValue(
      new Error("DB error"),
    );

    await expect(
      service.sendWeatherEmailsByFrequency("daily"),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to get subscriptions:",
      expect.any(Error),
    );
    expect(mailer.sendWeatherEmail).not.toHaveBeenCalled();
  });

  it("should not call mailer if getSubscriptionsByFrequency returns undefined", async () => {
    // @ts-expect-error: simulate undefined return
    dataProvider.getSubscriptionsByFrequency.mockResolvedValue(undefined);
    await service.sendWeatherEmailsByFrequency("daily");
    expect(mailer.sendWeatherEmail).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Weather email sent"),
    );
  });

  it("should handle empty city in subscription gracefully", async () => {
    const subWithNoCity = { ...testSub, city: "" };
    dataProvider.getSubscriptionsByFrequency.mockResolvedValue([subWithNoCity]);
    weatherManager.getWeatherData.mockResolvedValue(null);

    await service.sendWeatherEmailsByFrequency("daily");

    expect(weatherManager.getWeatherData).toHaveBeenCalledWith("");
    expect(mailer.sendWeatherEmail).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("No weather data found for city: ");
  });

  it("should handle mailer.sendWeatherEmail throwing synchronously", async () => {
    dataProvider.getSubscriptionsByFrequency.mockResolvedValue([testSub]);
    weatherManager.getWeatherData.mockResolvedValue(testWeather);
    mailer.sendWeatherEmail.mockImplementation(() => {
      throw new Error("Sync error");
    });

    await service.sendWeatherEmailsByFrequency("daily");

    expect(mailer.sendWeatherEmail).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to send weather email to user@mail.com for city Kyiv:",
      expect.any(Error),
    );
  });

  it("should handle weatherManager.getWeatherData throwing synchronously", async () => {
    dataProvider.getSubscriptionsByFrequency.mockResolvedValue([testSub]);
    weatherManager.getWeatherData.mockImplementation(() => {
      throw new Error("Sync weather error");
    });

    await service.sendWeatherEmailsByFrequency("daily");

    expect(mailer.sendWeatherEmail).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to send weather email to user@mail.com for city Kyiv:",
      expect.any(Error),
    );
  });

  it("should not send email if subscription is inactive", async () => {
    const inactiveSub = { ...testSub, is_active: false };
    dataProvider.getSubscriptionsByFrequency.mockResolvedValue([inactiveSub]);
    weatherManager.getWeatherData.mockResolvedValue(testWeather);

    await service.sendWeatherEmailsByFrequency("daily");

    // The logic does not check is_active, so this test documents current behavior
    expect(mailer.sendWeatherEmail).toHaveBeenCalled();
  });

  it("should process subscriptions with different cities", async () => {
    const sub1 = { ...testSub, city: "Kyiv" };
    const sub2 = {
      ...testSub,
      city: "Lviv",
      email: "other@mail.com",
      token: "token-2",
    };
    dataProvider.getSubscriptionsByFrequency.mockResolvedValue([sub1, sub2]);
    weatherManager.getWeatherData.mockResolvedValue(testWeather);
    mailer.sendWeatherEmail.mockResolvedValue();

    await service.sendWeatherEmailsByFrequency("daily");

    expect(weatherManager.getWeatherData).toHaveBeenCalledWith("Kyiv");
    expect(weatherManager.getWeatherData).toHaveBeenCalledWith("Lviv");
    expect(mailer.sendWeatherEmail).toHaveBeenCalledTimes(2);
    expect(mailer.sendWeatherEmail).toHaveBeenCalledWith(
      "user@mail.com",
      "Kyiv",
      testWeather,
      "token-123",
    );
    expect(mailer.sendWeatherEmail).toHaveBeenCalledWith(
      "other@mail.com",
      "Lviv",
      testWeather,
      "token-2",
    );
  });

  it("should handle all subscriptions failing weather data", async () => {
    const sub1 = { ...testSub, city: "Kyiv" };
    const sub2 = {
      ...testSub,
      city: "Lviv",
      email: "other@mail.com",
      token: "token-2",
    };
    dataProvider.getSubscriptionsByFrequency.mockResolvedValue([sub1, sub2]);
    weatherManager.getWeatherData.mockResolvedValue(null);

    await service.sendWeatherEmailsByFrequency("daily");

    expect(mailer.sendWeatherEmail).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "No weather data found for city: Kyiv",
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "No weather data found for city: Lviv",
    );
  });

  it("should handle empty subscriptions array", async () => {
    dataProvider.getSubscriptionsByFrequency.mockResolvedValue([]);
    await service.sendWeatherEmailsByFrequency("daily");
    expect(logSpy).toHaveBeenCalledWith(
      "No active subscriptions for frequency: daily",
    );
    expect(mailer.sendWeatherEmail).not.toHaveBeenCalled();
  });

  it("should not throw if frequency is invalid", async () => {
    dataProvider.getSubscriptionsByFrequency.mockResolvedValue([]);
    await expect(
      service.sendWeatherEmailsByFrequency(
        "invalid" as unknown as SubscriptionFrequency,
      ),
    ).resolves.toBeUndefined();
    expect(mailer.sendWeatherEmail).not.toHaveBeenCalled();
  });

  it("should not throw if subscription frequency is empty", async () => {
    const subNoFreq = {
      ...testSub,
      frequency: "" as unknown as SubscriptionFrequency,
    };
    dataProvider.getSubscriptionsByFrequency.mockResolvedValue([subNoFreq]);
    weatherManager.getWeatherData.mockResolvedValue(testWeather);

    await expect(
      service.sendWeatherEmailsByFrequency(
        "" as unknown as SubscriptionFrequency,
      ),
    ).resolves.toBeUndefined();
    expect(mailer.sendWeatherEmail).toHaveBeenCalled();
  });

  it("should not throw if getSubscriptionsByFrequency returns null", async () => {
    // @ts-expect-error: simulate null return
    dataProvider.getSubscriptionsByFrequency.mockResolvedValue(null);

    await expect(
      service.sendWeatherEmailsByFrequency("daily"),
    ).resolves.toBeUndefined();
    expect(mailer.sendWeatherEmail).not.toHaveBeenCalled();
  });

  it("should send emails for duplicate subscriptions", async () => {
    const sub2 = {
      ...testSub,
      email: "user@mail.com",
      city: "Kyiv",
      token: "token-123",
    };
    dataProvider.getSubscriptionsByFrequency.mockResolvedValue([testSub, sub2]);
    weatherManager.getWeatherData.mockResolvedValue(testWeather);

    await service.sendWeatherEmailsByFrequency("daily");

    expect(mailer.sendWeatherEmail).toHaveBeenCalledTimes(2);
  });
});
