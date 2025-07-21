export type SubscriptionFrequency = "daily" | "hourly";

export interface Subscription {
  id: string;
  email: string;
  city: string;
  frequency: SubscriptionFrequency;
  confirmed: boolean;
  token: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionInput {
  email: string;
  city: string;
  frequency: SubscriptionFrequency;
}

export interface SubscriptionServiceInterface {
  subscribe(subscription: SubscriptionInput): Promise<{ token: string }>;
  confirm(token: string): Promise<boolean>;
  unsubscribe(token: string): Promise<boolean>;
  healthCheck(): Promise<boolean>;
}

export interface DataProvider {
  checkSubscriptionExists(subscription: SubscriptionInput): Promise<boolean>;
  insertSubscription(
    subscription: SubscriptionInput,
    token: string,
    confirmed: boolean,
  ): Promise<void>;
  updateSubscriptionStatus(token: string, confirmed: boolean): Promise<boolean>;
  deleteSubscription(token: string): Promise<boolean>;
  getActiveSubscriptions(): Promise<Subscription[]>;
}
