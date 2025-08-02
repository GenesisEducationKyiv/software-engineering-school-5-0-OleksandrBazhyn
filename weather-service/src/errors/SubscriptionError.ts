export class CityNotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CityNotFound";
    Object.setPrototypeOf(this, CityNotFound.prototype);
  }
}

export class WeatherDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeatherDataError";
  }
}

export class WeatherServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeatherServiceError";
  }
}
