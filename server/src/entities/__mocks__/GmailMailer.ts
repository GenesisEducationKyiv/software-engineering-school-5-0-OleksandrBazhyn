import { Mailer, WeatherData } from "../../types.js";

let lastToken: string | undefined = undefined;

class MockGmailMailer implements Mailer {
  async sendConfirmationEmail(_email: string, _city: string, token: string): Promise<void> {
    lastToken = token;
  }

  async sendWeatherEmail(
    _email: string,
    _city: string,
    _weather: WeatherData,
    _token: string,
  ): Promise<void> {}

  __getLastToken(): string | undefined {
    return lastToken;
  }
}

export default MockGmailMailer;
