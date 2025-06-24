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
    super(`Email is already subscribed to ${city}`);
    this.name = "AlreadySubscribedError";
    this.email = email;
    this.city = city;
    Object.setPrototypeOf(this, AlreadySubscribedError.prototype);
  }
}

export class InvalidTokenError extends SubscriptionError {
  constructor() {
    super("Invalid token or subscription not found");
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
