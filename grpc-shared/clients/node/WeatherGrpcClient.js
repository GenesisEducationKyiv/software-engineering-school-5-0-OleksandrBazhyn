import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Weather gRPC Client Helper
 * 
 * Provides easy-to-use wrapper for weather service gRPC operations
 */
export class WeatherGrpcClient {
  constructor(address = 'localhost:50051', credentials = null) {
    this.address = address;
    this.credentials = credentials || grpc.credentials.createInsecure();
    this.client = null;
    this.init();
  }

  init() {
    const PROTO_PATH = path.join(__dirname, '../../proto/weather.proto');
    
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const weatherProto = grpc.loadPackageDefinition(packageDefinition);
    this.client = new weatherProto.weather.WeatherService(this.address, this.credentials);
  }

  /**
   * Health check
   */
  async healthCheck(service = 'weather') {
    return new Promise((resolve, reject) => {
      this.client.HealthCheck({ service }, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Get weather for a single city
   */
  async getWeather(city) {
    return new Promise((resolve, reject) => {
      this.client.GetWeather({ city }, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Get weather for multiple cities
   */
  async getWeatherBatch(cities) {
    return new Promise((resolve, reject) => {
      this.client.GetWeatherBatch({ cities }, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Close the client connection
   */
  close() {
    if (this.client) {
      this.client.close();
    }
  }
}

export default WeatherGrpcClient;
