import { EmailQueue } from "../../src/services/emailQueue.js";
import { WeatherData } from "../../src/types.js";

describe("EmailQueue", () => {
  it("should enqueue and dequeue confirmation jobs", () => {
    const queue = new EmailQueue();
    const job = {
      type: "confirmation",
      email: "a@b.com",
      city: "Kyiv",
      confirmUrl: "url"
    } as const;
    queue.enqueue(job);
    expect(queue.isEmpty()).toBe(false);
    expect(queue.dequeue()).toEqual(job);
    expect(queue.isEmpty()).toBe(true);
  });

  it("should enqueue and dequeue weather jobs", () => {
    const queue = new EmailQueue();
    const weatherData: WeatherData = {
      city: "Lviv",
      temperature: 20,
      humidity: 50,
      description: "Sunny",
    };
    const job = {
      type: "weather",
      email: "a@b.com",
      weatherData,
      unsubscribeUrl: "unsub"
    } as const;
    queue.enqueue(job);
    expect(queue.isEmpty()).toBe(false);
    expect(queue.dequeue()).toEqual(job);
    expect(queue.isEmpty()).toBe(true);
  });

  it("should support retries", () => {
    const queue = new EmailQueue();
    const job = {
      type: "confirmation",
      email: "a@b.com",
      city: "Kyiv",
      confirmUrl: "url",
      retries: 2
    } as const;
    queue.enqueue(job);
    const dequeued = queue.dequeue();
    expect(dequeued?.retries).toBe(2);
  });
});