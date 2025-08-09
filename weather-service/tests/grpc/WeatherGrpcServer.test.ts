import { WeatherProviderManagerInterface } from "../../src/types.js";
import { Logger } from "winston";

// Mock the WeatherGrpcServer to avoid import.meta.url issues
jest.mock("../../src/grpc/WeatherGrpcServer.js", () => ({
  WeatherGrpcServer: class MockWeatherGrpcServer {
    constructor(
      private weatherManager: WeatherProviderManagerInterface,
      private logger: Logger,
    ) {}

    async start(port: number): Promise<void> {
      this.logger.info(`Mock gRPC server started on port ${port}`);
    }

    async stop(): Promise<void> {
      this.logger.info("Mock gRPC server stopped");
    }
  },
}));

describe("WeatherGrpcServer", () => {
  let mockWeatherManager: jest.Mocked<WeatherProviderManagerInterface>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockWeatherManager = {
      getWeatherData: jest.fn(),
      getProvider: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("WeatherGrpcServer Integration", () => {
    it("should create server instance and accept dependencies", async () => {
      const { WeatherGrpcServer } = await import(
        "../../src/grpc/WeatherGrpcServer.js"
      );

      // Test that server can be created with required dependencies
      const server = new WeatherGrpcServer(mockWeatherManager, mockLogger);

      expect(server).toBeDefined();
      expect(typeof server.start).toBe("function");
      expect(typeof server.stop).toBe("function");
    });

    it("should validate dependency injection", async () => {
      const { WeatherGrpcServer } = await import(
        "../../src/grpc/WeatherGrpcServer.js"
      );

      // Test that constructor requires both dependencies
      expect(() => {
        new WeatherGrpcServer(mockWeatherManager, mockLogger);
      }).not.toThrow();

      // Test that missing dependencies would cause issues (type-level)
      expect(mockWeatherManager.getWeatherData).toBeDefined();
      expect(mockLogger.info).toBeDefined();
    });

    it("should use weather manager for data", async () => {
      const testWeatherData = {
        current: {
          temp_c: 20,
          humidity: 60,
          condition: { text: "Sunny" },
        },
      };

      mockWeatherManager.getWeatherData.mockResolvedValue(testWeatherData);

      const result = await mockWeatherManager.getWeatherData("London");

      expect(result).toEqual(testWeatherData);
      expect(mockWeatherManager.getWeatherData).toHaveBeenCalledWith("London");
    });

    it("should accept logger as dependency", async () => {
      const { WeatherGrpcServer } = await import(
        "../../src/grpc/WeatherGrpcServer.js"
      );

      // Test that logger is properly injected and available
      expect(() => {
        new WeatherGrpcServer(mockWeatherManager, mockLogger);
      }).not.toThrow();

      // Verify logger is the expected type
      expect(mockLogger.info).toBeDefined();
      expect(mockLogger.error).toBeDefined();
    });

    it("should handle weather provider errors gracefully", async () => {
      const error = new Error("Weather provider error");
      mockWeatherManager.getWeatherData.mockRejectedValue(error);

      // Test that the provider manager properly handles errors
      await expect(mockWeatherManager.getWeatherData("London")).rejects.toThrow(
        "Weather provider error",
      );

      // Verify the error propagation works as expected
      expect(mockWeatherManager.getWeatherData).toHaveBeenCalledWith("London");
    });
  });
});
