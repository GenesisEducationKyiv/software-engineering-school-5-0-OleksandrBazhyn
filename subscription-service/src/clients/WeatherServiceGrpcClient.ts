import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";
import type { WeatherServiceClient, WeatherData } from "../types.js";
import { config } from "../config.js";

const getProtoPath = () => {
  const isTest = process.env.NODE_ENV === "test";
  if (isTest) {
    return path.join(process.cwd(), "grpc-shared/proto/weather.proto");
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, "../../../grpc-shared/proto/weather.proto");
};

const PROTO_PATH = getProtoPath();

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

interface GrpcWeatherResponse {
  success: boolean;
  error_message?: string;
  data?: {
    temperature: number;
    humidity: number;
    description: string;
    city: string;
    timestamp: number;
  };
}

interface GrpcWeatherBatchResponse {
  success: boolean;
  error_message?: string;
  weather_data: Array<{
    temperature: number;
    humidity: number;
    description: string;
    city: string;
    timestamp: number;
  }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const weather = grpc.loadPackageDefinition(packageDefinition).weather as any;

class WeatherServiceGrpcClient implements WeatherServiceClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;

  constructor() {
    this.client = new weather.WeatherService(
      config.WEATHER_SERVICE_GRPC_URL,
      grpc.credentials.createInsecure(),
    );
  }

  async getWeatherData(city: string): Promise<WeatherData | null> {
    return new Promise((resolve, reject) => {
      this.client.GetWeather(
        { city },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any, response: GrpcWeatherResponse) => {
          if (error) {
            reject(new Error(`Weather service gRPC error: ${error.message}`));
            return;
          }

          if (!response.success) {
            if (response.error_message?.includes("not found")) {
              resolve(null);
              return;
            }
            reject(new Error(`Weather service error: ${response.error_message}`));
            return;
          }

          if (!response.data) {
            resolve(null);
            return;
          }

          const weatherData: WeatherData = {
            current: {
              temp_c: response.data.temperature,
              humidity: response.data.humidity,
              condition: { text: response.data.description },
            },
          };

          resolve(weatherData);
        },
      );
    });
  }

  async getWeatherBatch(cities: string[]): Promise<WeatherData[]> {
    return new Promise((resolve, reject) => {
      this.client.GetWeatherBatch(
        { cities },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any, response: GrpcWeatherBatchResponse) => {
          if (error) {
            reject(new Error(`Weather service gRPC batch error: ${error.message}`));
            return;
          }

          if (!response.success) {
            reject(new Error(`Weather service batch error: ${response.error_message}`));
            return;
          }

          const weatherDataArray: WeatherData[] = response.weather_data.map((data) => ({
            current: {
              temp_c: data.temperature,
              humidity: data.humidity,
              condition: { text: data.description },
            },
          }));

          resolve(weatherDataArray);
        },
      );
    });
  }

  async healthCheck(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.client.HealthCheck(
        {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any, response: { healthy: boolean }) => {
          if (error) {
            reject(new Error(`Weather service health check error: ${error.message}`));
            return;
          }

          resolve(response.healthy);
        },
      );
    });
  }

  closeConnection(): void {
    this.client.close();
  }
}

export default WeatherServiceGrpcClient;
