export class SubscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionError";
    Object.setPrototypeOf(this, SubscriptionError.prototype);
  }
}

export class AlreadySubscribedError extends SubscriptionError {
  email: string;
  city: string;

  constructor(email: string, city: string) {
    super("Email already subscribed");
    this.name = "AlreadySubscribedError";
    this.email = email;
    this.city = city;
    Object.setPrototypeOf(this, AlreadySubscribedError.prototype);
  }
}

export class InvalidTokenError extends SubscriptionError {
  constructor() {
    super("Invalid token");
    this.name = "InvalidTokenError";
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}

export class NotConfirmedError extends SubscriptionError {
  constructor() {
    super("Subscription not confirmed");
    this.name = "NotConfirmedError";
    Object.setPrototypeOf(this, NotConfirmedError.prototype);
  }
}

export class CityNotFound extends Error {
  constructor() {
    super("City not found");
    this.name = "CityNotFound";
    Object.setPrototypeOf(this, CityNotFound.prototype);
  }
}

export class WeatherServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeatherServiceError";
    Object.setPrototypeOf(this, WeatherServiceError.prototype);
  }
}

export class EmailServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailServiceError";
    Object.setPrototypeOf(this, EmailServiceError.prototype);
  }
}
