import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRoutes from "./routes/api.js";
import cron from "node-cron";
import Mailer from "./managers/Mailer.js";
import http from "http";
import { setupWebSocket } from "./ws-server.js";

const PORT: number = Number(process.env.PORT) || 3000;

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/v1", apiRoutes);

const server: http.Server = http.createServer(app);

setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running (HTTP + WS) on port ${PORT}`);
});

// Hourly (at the beginning of each hour)
cron.schedule("0 * * * *", () => {
  void Mailer.sendWeatherEmails("hourly");
});

// Every day at 8:00 am
cron.schedule("0 8 * * *", () => {
  void Mailer.sendWeatherEmails("daily");
});
