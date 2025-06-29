import express from "express";
import cors from "cors";
import apiRoutes, { weatherManager } from "./routes/api.js";
import http from "http";
import { setupWebSocket } from "./ws-server.js";
import Scheduler from "./entities/Scheduler.js";
import MailManager from "./entities/MailManager.js";
import SubscriptionDataProvider from "./entities/SubscriptionDataProvider.js";
import { config } from "./config.js";
import nodemailer from "nodemailer";

const PORT = Number(config.PORT) || 3000;

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/v1", apiRoutes);

const server = http.createServer(app);

setupWebSocket(server, weatherManager);

server.listen(PORT, () => {
  console.log(`Server is running (HTTP + WS) on port ${PORT}`);
});

Scheduler.start(
  new MailManager(
    nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    }),
  ),
  SubscriptionDataProvider,
);
