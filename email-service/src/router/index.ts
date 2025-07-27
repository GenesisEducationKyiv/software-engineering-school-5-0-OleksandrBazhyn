import { Router, Request, Response } from "express";
import { container } from "../di/container.js";
const router = Router();

const emailController = container.emailController;

router.post("/send", async (req: Request, res: Response) => {
  if (req.body.confirmUrl) {
    await emailController.sendConfirmationEmail(req, res);
  } else if (
    req.body.temperature !== undefined &&
    req.body.humidity !== undefined &&
    req.body.description &&
    req.body.unsubscribeUrl
  ) {
    await emailController.sendWeatherEmail(req, res);
  } else {
    res.status(400).json({ error: "Invalid email payload" });
  }
});

router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "Email service is healthy" });
});

export default router;
