import { WeatherScheduler } from "../../../src/services/scheduler/WeatherScheduler.js";
import { SubscriptionService } from "../../../src/services/SubscriptionService.js";
import { WeatherGrpcClient } from "../../../src/clients/WeatherGrpcClient.js";
import { EmailServiceClient } from "../../../src/clients/EmailServiceClient.js";

describe("WeatherScheduler", () => {
  let scheduler: WeatherScheduler;
  let mockSubscriptionService: jest.Mocked<SubscriptionService>;
  let mockWeatherClient: jest.Mocked<WeatherGrpcClient>;
  let mockEmailClient: jest.Mocked<EmailServiceClient>;

  beforeEach(() => {
    mockSubscriptionService = {
      getActiveSubscriptions: jest.fn(),
      sendWeatherUpdateToSubscription: jest.fn(),
    } as any;

    mockWeatherClient = {
      healthCheck: jest.fn().mockResolvedValue(true),
    } as any;

    mockEmailClient = {
      healthCheck: jest.fn().mockResolvedValue(true),
    } as any;

    scheduler = new WeatherScheduler(
      mockSubscriptionService, 
      mockWeatherClient, 
      mockEmailClient
    );
  });

  it("should schedule daily weather updates", () => {
    scheduler.startScheduler();
    expect(cron.schedule).toHaveBeenCalledWith("0 8 * * *", expect.any(Function));
  });
});
