import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type {
  WeatherData,
  WebSocketErrorMessage,
  WebSocketMessage,
  WebSocketInfoMessage,
  SubscriptionMessage,
  WeatherProviderManagerInterface,
} from "./types.js";
import { createLogger } from "./logger/index.js";

/**
 * Set up a WebSocket server using the given HTTP server.
 * Handles client subscriptions for live weather updates.
 * @param {http.Server} server - The HTTP server instance (from http.createServer)
 * @param {WeatherProviderManagerInterface} weatherManager - The weather provider manager instance
 */
export function setupWebSocket(
  server: Server,
  weatherManager: WeatherProviderManagerInterface,
): void {
  const logger = createLogger("WebSocketServer");

  // Create WebSocket server attached to the given HTTP server
  const wss = new WebSocketServer({ server });

  // In-memory map: each WebSocket client -> subscribed city
  const subscriptions = new Map<WebSocket, string>();

  // Handle new WebSocket connections
  wss.on("connection", (ws: WebSocket) => {
    // Handle incoming messages (subscribe to a city)
    ws.on("message", (data: WebSocket.RawData) => {
      try {
        const msg: SubscriptionMessage = JSON.parse(data.toString());
        if (
          msg.city &&
          typeof msg.city === "string" &&
          msg.city.trim() !== ""
        ) {
          // Save this city as the client's subscription
          subscriptions.set(ws, msg.city.trim());
        }
      } catch (error) {
        logger.error("Error parsing WebSocket message:", error);
        const errMsg: WebSocketErrorMessage = {
          type: "error",
          message: "Invalid message format",
        };
        ws.send(JSON.stringify(errMsg));
      }
    });

    // Remove client from subscriptions on disconnect
    ws.on("close", () => {
      subscriptions.delete(ws);
    });

    // Optional: send a greeting/info message to the client
    const infoMsg: WebSocketInfoMessage = {
      type: "info",
      message: "WebSocket connected!",
    };
    ws.send(JSON.stringify(infoMsg));
  });

  /**
   * Periodically send weather updates to all subscribed clients.
   * Each client receives the weather for their chosen city.
   */
  setInterval(async () => {
    for (const [ws, city] of subscriptions.entries()) {
      // Only send if the connection is open and city is defined
      if (ws.readyState === ws.OPEN && city) {
        try {
          const weatherData = await weatherManager.getWeatherData(city);

          // Send weather info if available
          if (weatherData && weatherData.current) {
            const weatherMsg: WebSocketMessage = {
              type: "weather",
              data: {
                temperature: weatherData.current.temp_c,
                humidity: weatherData.current.humidity,
                description: weatherData.current.condition.text,
              },
            };
            ws.send(JSON.stringify(weatherMsg));
          }
        } catch (error) {
          logger.error(`Error fetching weather for ${city}:`, error);
          const errMsg: WebSocketErrorMessage = {
            type: "error",
            message: `Failed to fetch weather for ${city}`,
          };
          ws.send(JSON.stringify(errMsg));
        }
      }
    }
  }, 15000); // Send updates every 15 seconds
}
