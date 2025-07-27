import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { existsSync } from "fs";
import path from "path";
import {
  WeatherData,
  WeatherRequest,
  WeatherResponse,
  WeatherServiceClient,
  WeatherProtoGrpcObject,
  GrpcHealthRequest,
  GrpcHealthResponse,
  WeatherGrpcClientInterface,
} from "../types.js";
import { createLogger } from "../logger/index.js";
import { config } from "../config.js";

export class WeatherGrpcClient implements WeatherGrpcClientInterface {
  private client: WeatherServiceClient | null = null;
  private isConnected = false;
  private logger = createLogger("WeatherGrpcClient");
  private reconnectAttempts = 0;
  private reconnectTimeout?: NodeJS.Timeout;
  private readonly maxReconnectAttempts = 3;

  constructor(private weatherServiceUrl: string = config.weather.grpcUrl) {}

  async initialize(): Promise<void> {
    await this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    try {
      const protoPath = this.resolveProtoPath();

      this.logger.debug("Loading weather proto", { protoPath });

      const packageDefinition = protoLoader.loadSync(protoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const weatherProto = grpc.loadPackageDefinition(
        packageDefinition,
      ) as unknown as WeatherProtoGrpcObject;

      this.client = new weatherProto.weather.WeatherService(
        this.weatherServiceUrl,
        grpc.credentials.createInsecure(),
      );

      this.isConnected = true;
      this.reconnectAttempts = 0;

      this.logger.info("Weather gRPC client initialized", {
        url: this.weatherServiceUrl,
      });
    } catch (error) {
      this.logger.error("Failed to initialize weather gRPC client:", {
        error: error instanceof Error ? error.message : String(error),
        url: this.weatherServiceUrl,
        attempt: this.reconnectAttempts + 1,
      });

      this.isConnected = false;
      this.scheduleReconnect();
      throw error; // Re-throw for explicit initialization
    }
  }

  private resolveProtoPath(): string {
    // 1. Environment variable (highest priority)
    if (config.weather.protoPath && existsSync(config.weather.protoPath)) {
      this.logger.debug("Using proto path from config", { path: config.weather.protoPath });
      return config.weather.protoPath;
    }

    // 2. Try grpc-shared as npm package
    const packagePaths = [
      // If grpc-shared is installed as npm package
      path.resolve(process.cwd(), "node_modules", "grpc-shared", "proto", "weather.proto"),
      // Monorepo structure - sibling directory
      path.resolve(process.cwd(), "..", "grpc-shared", "proto", "weather.proto"),
      // Current project structure
      path.resolve(__dirname, "..", "..", "..", "grpc-shared", "proto", "weather.proto"),
    ];

    // 3. Try development paths
    const devPaths = [
      // Direct grpc-shared in current workspace
      path.resolve(process.cwd(), "grpc-shared", "proto", "weather.proto"),
      // Local proto copy
      path.resolve(process.cwd(), "proto", "weather.proto"),
      path.resolve(__dirname, "..", "..", "proto", "weather.proto"),
    ];

    // 4. Try production/Docker paths
    const prodPaths = [
      path.resolve("/app", "grpc-shared", "proto", "weather.proto"),
      path.resolve("/app", "proto", "weather.proto"),
      path.resolve("/usr/src/app", "proto", "weather.proto"),
    ];

    const allPaths = [...packagePaths, ...devPaths, ...prodPaths];

    for (const protoPath of allPaths) {
      if (existsSync(protoPath)) {
        this.logger.debug("Located weather proto file", {
          path: protoPath,
          source: packagePaths.includes(protoPath)
            ? "package"
            : devPaths.includes(protoPath)
              ? "development"
              : "production",
        });
        return protoPath;
      }
    }

    this.logger.error("Weather proto file not found in any location", {
      attemptedPaths: allPaths,
      suggestion: "Install grpc-shared package or set WEATHER_PROTO_PATH environment variable",
    });

    throw new Error(`Weather proto file not found. Try:
1. npm install ../grpc-shared
2. Set WEATHER_PROTO_PATH environment variable
3. Copy proto files to ./proto/ directory`);
  }

  private scheduleReconnect(): void {
    // Clear existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error("Max weather service reconnect attempts reached", {
        maxAttempts: this.maxReconnectAttempts,
        url: this.weatherServiceUrl,
      });
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;

    this.logger.info("Scheduling weather service reconnect", {
      attempt: this.reconnectAttempts,
      delayMs: delay,
      maxAttempts: this.maxReconnectAttempts,
    });

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = undefined;
      try {
        await this.initializeClient();
      } catch (error) {
        this.logger.error("Reconnect attempt failed:", {
          error: error instanceof Error ? error.message : String(error),
          attempt: this.reconnectAttempts,
          url: this.weatherServiceUrl,
        });
      }
    }, delay);
  }

  async getWeather(city: string): Promise<WeatherData> {
    if (!this.isConnected || !this.client) {
      throw new Error("Weather gRPC client is not connected");
    }

    if (!city?.trim()) {
      throw new Error("City parameter is required and cannot be empty");
    }

    const normalizedCity = city.trim();

    return new Promise<WeatherData>((resolve, reject) => {
      const requestTimeout = setTimeout(() => {
        reject(new Error(`Weather request timeout after ${config.weather.timeout}ms`));
      }, config.weather.timeout);

      const request: WeatherRequest = { city: normalizedCity };

      if (!this.client) {
        clearTimeout(requestTimeout);
        reject(new Error("Weather gRPC client is not connected"));
        return;
      }

      this.client.GetWeather(
        request,
        (error: grpc.ServiceError | null, response: WeatherResponse) => {
          clearTimeout(requestTimeout);

          if (error) {
            this.logger.error("Weather gRPC request failed:", {
              city: normalizedCity,
              code: error.code,
              message: error.message,
              details: error.details,
            });

            // Handle connection issues
            if (
              error.code === grpc.status.UNAVAILABLE ||
              error.code === grpc.status.DEADLINE_EXCEEDED
            ) {
              this.isConnected = false;
              this.scheduleReconnect();
            }

            reject(new Error(`Weather service unavailable: ${error.message}`));
            return;
          }

          if (response.success && response.data) {
            this.logger.debug("Weather data retrieved successfully", {
              city: normalizedCity,
              temperature: response.data.temperature,
              humidity: response.data.humidity,
            });

            resolve({
              city: normalizedCity,
              temperature: response.data.temperature,
              description: response.data.description,
              humidity: response.data.humidity,
              timestamp: response.data.timestamp ?? Date.now(),
            });
          } else {
            const errorMessage = response.error_message || "Weather data not available";
            this.logger.warn("Weather service returned error response", {
              city: normalizedCity,
              error: errorMessage,
            });
            reject(new Error(errorMessage));
          }
        },
      );
    });
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      this.logger.debug("Weather health check skipped - client not connected");
      return false;
    }

    return new Promise<boolean>((resolve) => {
      const healthTimeout = setTimeout(() => {
        this.logger.debug("Weather health check timeout");
        resolve(false);
      }, config.health.timeout);

      const request: GrpcHealthRequest = { service: "weather" };

      this.client?.HealthCheck(
        request,
        (error: grpc.ServiceError | null, response: GrpcHealthResponse) => {
          clearTimeout(healthTimeout);

          if (error) {
            this.logger.debug("Weather health check failed", {
              code: error.code,
              message: error.message,
            });

            // Handle connection issues
            if (error.code === grpc.status.UNAVAILABLE) {
              this.isConnected = false;
              this.scheduleReconnect();
            }

            resolve(false);
            return;
          }

          const isHealthy = response.status === 1; // SERVING = 1

          this.logger.debug("Weather health check completed", {
            status: response.status,
            isHealthy,
          });

          resolve(isHealthy);
        },
      );
    });
  }

  disconnect(): void {
    // Clear any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    if (this.client && this.isConnected) {
      try {
        this.client.close();
        this.logger.info("Weather gRPC client disconnected successfully");
      } catch (error) {
        this.logger.warn("Error disconnecting weather gRPC client:", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  isClientConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  getConnectionInfo(): { url: string; connected: boolean; attempts: number } {
    return {
      url: this.weatherServiceUrl,
      connected: this.isConnected,
      attempts: this.reconnectAttempts,
    };
  }
}

export type { WeatherData };
