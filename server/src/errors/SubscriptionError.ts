export class SubscriptionError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "SubscriptionError";
    this.statusCode = statusCode;

    Object.setPrototypeOf(this, SubscriptionError.prototype);
  }

  static alreadySubscribed(email: string, city: string): SubscriptionError {
    return new SubscriptionError(`Email is already subscribed to ${city}`, 409);
  }

  static invalidToken(): SubscriptionError {
    return new SubscriptionError("Invalid token or subscription not found", 400);
  }

  static notConfirmed(): SubscriptionError {
    return new SubscriptionError("Subscription not confirmed", 400);
  }
}
