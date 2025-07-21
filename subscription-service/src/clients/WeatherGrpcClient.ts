import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { logger } from "../logger";
import path from "path";

interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  pressure: number;
}

export class WeatherGrpcClient {
  private client: any;
  private isConnected: boolean = false;

  constructor(weatherServiceUrl: string = "localhost:50051") {
    try {
      // Use the shared proto file from grpc-shared
      const protoPath = path.resolve(
        __dirname,
        "../../../grpc-shared/proto/weather.proto",
      );
      const packageDefinition = protoLoader.loadSync(protoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const weatherProto = grpc.loadPackageDefinition(packageDefinition) as any;

      this.client = new weatherProto.weather.WeatherService(
        weatherServiceUrl,
        grpc.credentials.createInsecure(),
      );

      this.isConnected = true;
      logger.info(`gRPC client initialized for weather service: ${weatherServiceUrl}`);
    } catch (error) {
      logger.error("Failed to initialize gRPC client:", error);
      throw error;
    }
  }

  async getWeather(city: string): Promise<WeatherData> {
    if (!this.isConnected) {
      throw new Error("gRPC client is not connected");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("gRPC request timeout"));
      }, 5000);

      this.client.GetWeather({ city }, (error: any, response: any) => {
        clearTimeout(timeout);

        if (error) {
          logger.error("Error fetching weather via gRPC:", {
            city,
            error: error.message,
            code: error.code,
          });
          reject(error);
        } else {
          // Map the response to your interface
          if (response.success && response.data) {
            resolve({
              temperature: response.data.temperature,
              description: response.data.description,
              humidity: response.data.humidity,
              windSpeed: 0, // Not provided by weather service
              pressure: 0, // Not provided by weather service
            });
          } else {
            reject(new Error(response.error_message || "Weather data not found"));
          }
        }
      });
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      return new Promise((resolve) => {
        this.client.HealthCheck({ service: "weather" }, (error: any, response: any) => {
          if (error) {
            resolve(false);
          } else {
            resolve(response.status === 1); // SERVING = 1
          }
        });
      });
    } catch (error) {
      return false;
    }
  }

  disconnect(): void {
    if (this.client && this.isConnected) {
      this.client.close();
      this.isConnected = false;
      logger.info("gRPC client disconnected");
    }
  }
}
