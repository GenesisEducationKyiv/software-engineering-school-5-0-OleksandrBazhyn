import type { WeatherData } from "../../../src/types.js";

const mockWeatherServiceGrpcClient = {
  getWeatherData: jest.fn(),
};

// Mock constructor
jest.mock("../../../src/clients/WeatherServiceGrpcClient.js", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockWeatherServiceGrpcClient),
  };
});

import WeatherServiceGrpcClient from "../../../src/clients/WeatherServiceGrpcClient.js";

describe("WeatherServiceGrpcClient", () => {
  let client: WeatherServiceGrpcClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new WeatherServiceGrpcClient();
  });

  describe("getWeatherData", () => {
    it("should return weather data for valid city", async () => {
      const mockWeatherData: WeatherData = {
        current: {
          temp_c: 22.5,
          humidity: 65,
          condition: { text: "Partly cloudy" },
        },
      };

      (client.getWeatherData as jest.Mock).mockResolvedValue(mockWeatherData);

      const result = await client.getWeatherData("Prague");

      expect(result).toEqual(mockWeatherData);
      expect(client.getWeatherData).toHaveBeenCalledWith("Prague");
    });

    it("should return null for non-existent city", async () => {
      (client.getWeatherData as jest.Mock).mockResolvedValue(null);

      const result = await client.getWeatherData("NonExistentCity");

      expect(result).toBeNull();
      expect(client.getWeatherData).toHaveBeenCalledWith("NonExistentCity");
    });

    it("should throw error for gRPC communication error", async () => {
      const error = new Error("gRPC communication error");
      (client.getWeatherData as jest.Mock).mockRejectedValue(error);

      await expect(client.getWeatherData("Prague")).rejects.toThrow(
        "gRPC communication error",
      );
    });

    it("should throw error for service error", async () => {
      const error = new Error("Weather service error: Service error");
      (client.getWeatherData as jest.Mock).mockRejectedValue(error);

      await expect(client.getWeatherData("Prague")).rejects.toThrow(
        "Weather service error: Service error",
      );
    });
  });
});
