import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";
import { WeatherProviderManagerInterface } from "../types.js";
import { Logger } from "winston";
import {
  grpcRequestsTotal,
  grpcRequestDuration,
  weatherRequestsByCity,
  errorRate,
} from "../metrics/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load protobuf
const PROTO_PATH = path.join(__dirname, "../../../grpc-shared/proto/weather.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const weatherProto = grpc.loadPackageDefinition(packageDefinition) as any;

export interface WeatherGrpcRequest {
  city: string;
}

export interface WeatherBatchGrpcRequest {
  cities: string[];
}

export interface HealthCheckGrpcRequest {
  service: string;
}

export interface WeatherGrpcResponse {
  success: boolean;
  error_message: string;
  data: {
    temperature: number;
    humidity: number;
    description: string;
    city: string;
    timestamp: number;
  } | null;
}

export interface WeatherBatchGrpcResponse {
  success: boolean;
  error_message: string;
  data: Array<{
    temperature: number;
    humidity: number;
    description: string;
    city: string;
    timestamp: number;
  }>;
}

export interface HealthCheckGrpcResponse {
  status: number;
  message: string;
}

export class WeatherGrpcServer {
  private server: grpc.Server;
  private weatherManager: WeatherProviderManagerInterface;
  private logger: Logger;

  constructor(weatherManager: WeatherProviderManagerInterface, logger: Logger) {
    this.server = new grpc.Server();
    this.weatherManager = weatherManager;
    this.logger = logger;

    // Add service implementation
    this.server.addService(weatherProto.weather.WeatherService.service, {
      GetWeather: this.getWeather.bind(this),
      GetWeatherBatch: this.getWeatherBatch.bind(this),
      HealthCheck: this.healthCheck.bind(this),
    });
  }

  private async getWeather(
    call: grpc.ServerUnaryCall<WeatherGrpcRequest, WeatherGrpcResponse>,
    callback: grpc.sendUnaryData<WeatherGrpcResponse>,
  ) {
    const startTime = Date.now();
    const method = "GetWeather";

    try {
      const { city } = call.request;

      grpcRequestsTotal.inc({ method, status: "attempt" });
      weatherRequestsByCity.inc({ city: city || "unknown" });

      if (!city) {
        grpcRequestsTotal.inc({ method, status: "invalid_argument" });
        this.logger.warn("gRPC GetWeather: City parameter missing");

        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: "City is required",
        });
      }

      this.logger.debug("gRPC: Getting weather", {
        city,
        method,
      });

      const weatherData = await this.weatherManager.getWeatherData(city);

      const duration = (Date.now() - startTime) / 1000;
      grpcRequestDuration.observe({ method }, duration);

      if (!weatherData || !weatherData.current) {
        grpcRequestsTotal.inc({ method, status: "not_found" });

        this.logger.warn("gRPC: Weather data not found", {
          city,
          method,
          duration: duration * 1000,
        });

        return callback(null, {
          success: false,
          error_message: "City not found",
          data: null,
        });
      }

      grpcRequestsTotal.inc({ method, status: "success" });

      const response = {
        success: true,
        error_message: "",
        data: {
          temperature: weatherData.current.temp_c,
          humidity: weatherData.current.humidity,
          description: weatherData.current.condition.text,
          city,
          timestamp: Date.now(),
        },
      };

      this.logger.info("gRPC: Weather data retrieved successfully", {
        city,
        method,
        duration: duration * 1000,
      });

      callback(null, response);
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      grpcRequestsTotal.inc({ method, status: "error" });
      grpcRequestDuration.observe({ method }, duration);
      errorRate.inc({ type: "grpc", service: method });

      this.logger.error("gRPC: Error getting weather", {
        city: call.request.city,
        method,
        duration: duration * 1000,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      callback({
        code: grpc.status.INTERNAL,
        message: "Internal server error",
      });
    }
  }

  private async getWeatherBatch(
    call: grpc.ServerUnaryCall<WeatherBatchGrpcRequest, WeatherBatchGrpcResponse>,
    callback: grpc.sendUnaryData<WeatherBatchGrpcResponse>,
  ) {
    try {
      const { cities } = call.request;

      if (!cities || cities.length === 0) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: "At least one city is required",
        });
      }

      this.logger.debug(`gRPC: Getting weather for ${cities.length} cities`);

      const weatherDataPromises = cities.map(async (city) => {
        try {
          const weatherData = await this.weatherManager.getWeatherData(city);
          if (weatherData && weatherData.current) {
            return {
              temperature: weatherData.current.temp_c,
              humidity: weatherData.current.humidity,
              description: weatherData.current.condition.text,
              city,
              timestamp: Date.now(),
            };
          }
          return null;
        } catch (error) {
          this.logger.warn(`gRPC: Failed to get weather for ${city}:`, error);
          return null;
        }
      });

      const results = await Promise.all(weatherDataPromises);
      const validResults = results.filter((result) => result !== null);

      const response = {
        success: true,
        error_message: "",
        data: validResults,
      };

      this.logger.info(
        `gRPC: Batch weather data retrieved for ${validResults.length}/${cities.length} cities`,
      );
      callback(null, response);
    } catch (error) {
      this.logger.error("gRPC: Error in batch weather request:", error);
      callback({
        code: grpc.status.INTERNAL,
        message: "Internal server error",
      });
    }
  }

  private healthCheck(
    call: grpc.ServerUnaryCall<HealthCheckGrpcRequest, HealthCheckGrpcResponse>,
    callback: grpc.sendUnaryData<HealthCheckGrpcResponse>,
  ) {
    const response = {
      status: 1, // SERVING
      message: "Weather Service is healthy",
    };

    this.logger.debug("gRPC: Health check requested");
    callback(null, response);
  }

  start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const address = `0.0.0.0:${port}`;

      this.server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (error, port) => {
        if (error) {
          this.logger.error("Failed to start gRPC server:", error);
          reject(error);
          return;
        }

        this.server.start();
        this.logger.info(`gRPC Weather Service started on port ${port}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.tryShutdown((error) => {
        if (error) {
          this.logger.error("Error shutting down gRPC server:", error);
        } else {
          this.logger.info("gRPC server shut down gracefully");
        }
        resolve();
      });
    });
  }
}
