import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import {
  WeatherData,
  WeatherRequest,
  WeatherResponse,
  WeatherServiceClient,
  WeatherProtoGrpcObject,
  HealthCheckRequest,
  HealthCheckResponse,
} from "../types";
import { Logger } from "winston";
import { WeatherGrpcClientInterface } from "../types.js";

export class WeatherGrpcClient implements WeatherGrpcClientInterface {
  private client: WeatherServiceClient;
  private isConnected = false;
  private logger: Logger;

  constructor(weatherServiceUrl = "localhost:50051", logger: Logger) {
    this.logger = logger;
    try {
      const protoPath = path.resolve(__dirname, "../../../grpc-shared/proto/weather.proto");

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
        weatherServiceUrl,
        grpc.credentials.createInsecure(),
      );

      this.isConnected = true;
      this.logger.info(`gRPC client initialized for weather service: ${weatherServiceUrl}`);
    } catch (error) {
      this.logger.error("Failed to initialize gRPC client:", error);
      throw error;
    }
  }

  async getWeather(city: string): Promise<WeatherData> {
    if (!this.isConnected) {
      throw new Error("gRPC client is not connected");
    }

    return new Promise<WeatherData>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("gRPC request timeout"));
      }, 5000);

      this.client.GetWeather(
        { city },
        (error: grpc.ServiceError | null, response: WeatherResponse) => {
          clearTimeout(timeout);

          if (error) {
            this.logger.error("Error fetching weather via gRPC:", {
              city,
              error: error.message,
              code: error.code,
            });
            reject(error);
          } else if (response.success && response.data) {
            resolve({
              temperature: response.data.temperature,
              description: response.data.description,
              humidity: response.data.humidity,
            });
          } else {
            reject(new Error(response.error_message || "Weather data not found"));
          }
        },
      );
    });
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 3000);

      this.client.HealthCheck(
        { service: "weather" },
        (error: grpc.ServiceError | null, response: HealthCheckResponse) => {
          clearTimeout(timeout);

          if (error) {
            this.logger.debug("Health check failed:", error.message);
            resolve(false);
          } else {
            resolve(response.status === 1); // SERVING = 1
          }
        },
      );
    });
  }

  disconnect(): void {
    if (this.client && this.isConnected) {
      this.client.close();
      this.isConnected = false;
      this.logger.info("gRPC client disconnected");
    }
  }
}

export type { WeatherData };
