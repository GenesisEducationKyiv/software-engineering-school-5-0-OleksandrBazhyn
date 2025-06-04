import { WebSocketServer } from "ws";
import WeatherManager from "./api/managers/WeatherManager.js"; // Adjust the path if needed

/**
 * Set up a WebSocket server using the given HTTP server.
 * Handles client subscriptions for live weather updates.
 * @param {http.Server} server - The HTTP server instance (from http.createServer)
 */
export function setupWebSocket(server) {
  // Create WebSocket server attached to the given HTTP server
  const wss = new WebSocketServer({ server });

  // In-memory map: each WebSocket client -> subscribed city
  const subscriptions = new Map();

  // Handle new WebSocket connections
  wss.on("connection", (ws) => {
    // Handle incoming messages (subscribe to a city)
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.city && typeof msg.city === "string" && msg.city.trim() !== "") {
          // Save this city as the client's subscription
          subscriptions.set(ws, msg.city.trim());
        }
      } catch (e) {
        // Ignore invalid messages
      }
    });

    // Remove client from subscriptions on disconnect
    ws.on("close", () => {
      subscriptions.delete(ws);
    });

    // Optional: send a greeting/info message to the client
    ws.send(JSON.stringify({ type: "info", message: "WebSocket connected!" }));
  });

  /**
   * Periodically send weather updates to all subscribed clients.
   * Each client receives the weather for their chosen city.
   */
  setInterval(async () => {
    for (const [ws, city] of subscriptions) {
      // Only send if the connection is open and city is defined
      if (ws.readyState === ws.OPEN && city) {
        try {
          // Fetch weather for the city using WeatherManager
          const weatherManager = new WeatherManager();
          const weatherData = await weatherManager.fetchWeatherData(city);

          // Send weather info if available
          if (weatherData && weatherData.current) {
            ws.send(
              JSON.stringify({
                type: "weather",
                data: {
                  temperature: weatherData.current.temp_c,
                  humidity: weatherData.current.humidity,
                  description: weatherData.current.condition.text,
                },
              })
            );
          }
        } catch (err) {
          // If weather fetching fails, silently skip this cycle
        }
      }
    }
  }, 15000); // Send updates every 15 seconds
}