import { SubscriptionInput } from "../types.js";

export function validateSubscriptionInput(input: any): string | null {
  // Перевірка наявності полів
  if (!input.email || !input.city || !input.frequency) {
    return "Missing required fields: email, city, frequency";
  }

  // Валідація email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.email)) {
    return "Invalid email format";
  }

  // Валідація frequency
  if (!["daily", "hourly"].includes(input.frequency)) {
    return "Frequency must be 'daily' or 'hourly'";
  }

  // Валідація city
  if (typeof input.city !== 'string' || input.city.trim().length < 2) {
    return "City name must be at least 2 characters long";
  }

  // Додatkові перевірки
  if (input.email.length > 100) {
    return "Email is too long";
  }

  if (input.city.length > 50) {
    return "City name is too long";
  }

  return null; // Валідація пройшла успішно
}

export function validateToken(token: string): string | null {
  if (!token || typeof token !== 'string') {
    return "Token is required";
  }

  if (token.length < 10) {
    return "Invalid token format";
  }

  return null;
}