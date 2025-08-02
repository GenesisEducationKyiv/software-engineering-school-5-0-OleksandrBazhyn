import { WeatherData } from "../types.js";

type EmailJob =
  | { type: "confirmation"; email: string; city: string; confirmUrl: string; retries?: number }
  | {
      type: "weather-update";
      email: string;
      weatherData: WeatherData;
      unsubscribeUrl: string;
      retries?: number;
    };

export class EmailQueue {
  private queue: EmailJob[] = [];

  enqueue(job: EmailJob) {
    this.queue.push(job);
  }

  dequeue(): EmailJob | undefined {
    return this.queue.shift();
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
