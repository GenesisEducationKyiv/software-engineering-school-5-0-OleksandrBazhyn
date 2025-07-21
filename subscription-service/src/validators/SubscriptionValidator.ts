import {
  SubscriptionInput,
  SubscriptionFrequency,
  ValidationResult,
  UnvalidatedSubscriptionInput,
} from "../types.js";

const VALIDATION_RULES = {
  email: {
    maxLength: 100,
    minLength: 5,
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  city: {
    maxLength: 50,
    minLength: 2,
    regex: /^[a-zA-Z\s\-'.,]+$/,
  },
  token: {
    regex: /^[a-zA-Z0-9\-_]+$/,
  },
} as const;

const VALID_FREQUENCIES: readonly SubscriptionFrequency[] = ["daily", "hourly"];

export function validateSubscriptionInput(input: unknown): string | null {
  const result = validateSubscriptionInputDetailed(input);
  return result.isValid ? null : result.errors[0];
}

export function validateSubscriptionInputDetailed(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isObject(input)) {
    return {
      isValid: false,
      errors: ["Invalid input format - must be an object"],
    };
  }

  const typedInput = input as UnvalidatedSubscriptionInput;

  // Validate required fields
  const requiredFields = ["email", "city", "frequency"] as const;
  const missingFields = requiredFields.filter((field) => !hasValidStringValue(typedInput[field]));

  if (missingFields.length > 0) {
    errors.push(`Missing required fields: ${missingFields.join(", ")}`);
  }

  // Individual field validation
  if (typedInput.email !== undefined) {
    const emailErrors = validateEmail(typedInput.email);
    errors.push(...emailErrors);
  }

  if (typedInput.city !== undefined) {
    const cityErrors = validateCity(typedInput.city);
    errors.push(...cityErrors);
  }

  if (typedInput.frequency !== undefined) {
    const frequencyErrors = validateFrequency(typedInput.frequency);
    errors.push(...frequencyErrors);
  }

  // Check for unexpected fields
  const allowedFields = ["email", "city", "frequency"];
  const unexpectedFields = Object.keys(typedInput).filter(
    (field) => !allowedFields.includes(field),
  );

  if (unexpectedFields.length > 0) {
    errors.push(`Unexpected fields: ${unexpectedFields.join(", ")}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateEmail(email: unknown): string[] {
  const errors: string[] = [];

  if (!isString(email)) {
    errors.push("Email must be a string");
    return errors;
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (trimmedEmail.length < VALIDATION_RULES.email.minLength) {
    errors.push(`Email must be at least ${VALIDATION_RULES.email.minLength} characters long`);
  }

  if (trimmedEmail.length > VALIDATION_RULES.email.maxLength) {
    errors.push(`Email must not exceed ${VALIDATION_RULES.email.maxLength} characters`);
  }

  if (!VALIDATION_RULES.email.regex.test(trimmedEmail)) {
    errors.push("Invalid email format");
  }

  if (trimmedEmail.includes("..")) {
    errors.push("Email cannot contain consecutive dots");
  }

  if (trimmedEmail.startsWith(".") || trimmedEmail.endsWith(".")) {
    errors.push("Email cannot start or end with a dot");
  }

  return errors;
}

export function validateCity(city: unknown): string[] {
  const errors: string[] = [];

  if (!isString(city)) {
    errors.push("City must be a string");
    return errors;
  }

  const trimmedCity = city.trim();

  if (trimmedCity.length < VALIDATION_RULES.city.minLength) {
    errors.push(`City name must be at least ${VALIDATION_RULES.city.minLength} characters long`);
  }

  if (trimmedCity.length > VALIDATION_RULES.city.maxLength) {
    errors.push(`City name must not exceed ${VALIDATION_RULES.city.maxLength} characters`);
  }

  if (!VALIDATION_RULES.city.regex.test(trimmedCity)) {
    errors.push("City name contains invalid characters");
  }

  if (/\s{2,}/.test(trimmedCity)) {
    errors.push("City name cannot contain consecutive spaces");
  }

  return errors;
}

export function validateFrequency(frequency: unknown): string[] {
  const errors: string[] = [];

  if (!isString(frequency)) {
    errors.push("Frequency must be a string");
    return errors;
  }

  if (!isValidFrequency(frequency)) {
    errors.push(`Frequency must be one of: ${VALID_FREQUENCIES.join(", ")}`);
  }

  return errors;
}

export function validateToken(token: unknown): string | null {
  const result = validateTokenDetailed(token);
  return result.isValid ? null : result.errors[0];
}

export function validateTokenDetailed(token: unknown): ValidationResult {
  const errors: string[] = [];

  if (token === null || token === undefined) {
    errors.push("Token is required");
    return { isValid: false, errors, field: "token" };
  }

  if (!isString(token)) {
    errors.push("Token must be a string");
    return { isValid: false, errors, field: "token" };
  }

  const trimmedToken = token.trim();

  if (!VALIDATION_RULES.token.regex.test(trimmedToken)) {
    errors.push("Token contains invalid characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
    field: "token",
  };
}

export function sanitizeSubscriptionInput(input: unknown): SubscriptionInput | null {
  const validation = validateSubscriptionInputDetailed(input);
  if (!validation.isValid || !isObject(input)) {
    return null;
  }

  const typedInput = input as UnvalidatedSubscriptionInput;

  // Double-check types before sanitizing
  if (
    !isString(typedInput.email) ||
    !isString(typedInput.city) ||
    !isValidFrequency(typedInput.frequency)
  ) {
    return null;
  }

  return {
    email: typedInput.email.trim().toLowerCase(),
    city: typedInput.city.trim(),
    frequency: typedInput.frequency,
  };
}

export function isValidSubscriptionInput(input: unknown): input is SubscriptionInput {
  const validation = validateSubscriptionInputDetailed(input);
  if (!validation.isValid || !isObject(input)) {
    return false;
  }

  const typedInput = input as UnvalidatedSubscriptionInput;

  return (
    isString(typedInput.email) &&
    isString(typedInput.city) &&
    isValidFrequency(typedInput.frequency)
  );
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasValidStringValue(value: unknown): boolean {
  return isString(value) && value.trim() !== "";
}

function isValidFrequency(value: unknown): value is SubscriptionFrequency {
  return isString(value) && (VALID_FREQUENCIES as readonly string[]).includes(value);
}
