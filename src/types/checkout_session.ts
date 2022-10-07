import { RecurringInterval } from "./subscription";

export interface ISubscriptionSettings {
    interval: RecurringInterval
    interval_count: number;
}

export interface ICreateCheckoutSession {
    cancel_url: string;
    success_url: string;
    optimistic_redirect: boolean;
    amount: string;
    subscription: ISubscriptionSettings;
}