import { Request } from "express";

export interface RequestWithId extends Request {
  requestId?: string;
}

export interface LogRequestData {
  message: string;
  method: string;
  url: string;
  query: unknown;
  ip?: string;
  userAgent?: string;
  headers?: Record<string, unknown>;
  body?: unknown;
}

export interface LogResponseData {
  message: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  contentLength?: string;
}
