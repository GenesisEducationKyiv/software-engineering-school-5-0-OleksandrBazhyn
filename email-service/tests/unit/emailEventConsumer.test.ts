import { handleEmailEvent } from "../../src/infra/EmailEventConsumer";
import { container } from "../../src/di/container";

jest.mock("../../src/di/container", () => ({
  container: {
    emailQueue: { enqueue: jest.fn() },
  },
}));

describe("handleEmailEvent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("enqueues confirmation email job on subscription_confirmed", async () => {
    const event = {
      type: "subscription_confirmed",
      email: "test@mail.com",
      city: "Kyiv",
      confirmUrl: "http://confirm",
    };
    await handleEmailEvent(JSON.stringify(event));
    expect(container.emailQueue.enqueue).toHaveBeenCalledWith({
      type: "confirmation",
      email: "test@mail.com",
      city: "Kyiv",
      confirmUrl: "http://confirm",
    });
  });

  it("enqueues weather-update email job on weather_update", async () => {
    const event = {
      type: "weather_update",
      email: "test@mail.com",
      city: "Kyiv",
      temperature: 20,
      humidity: 50,
      description: "Sunny",
      unsubscribeUrl: "http://unsub",
    };
    await handleEmailEvent(JSON.stringify(event));
    expect(container.emailQueue.enqueue).toHaveBeenCalledWith({
      type: "weather-update",
      email: "test@mail.com",
      weatherData: {
        city: "Kyiv",
        temperature: 20,
        humidity: 50,
        description: "Sunny",
      },
      unsubscribeUrl: "http://unsub",
    });
  });
});
