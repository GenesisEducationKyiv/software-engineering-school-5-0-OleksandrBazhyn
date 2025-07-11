import { Router, Request, Response } from "express";
import { container } from "../di/container.js";
const router = Router();

const emailController = container.emailController;

router.post("/send", (req: Request, res: Response) => {
  emailController.sendConfirmationEmail(req, res);
});

router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "Email service is healthy" });
});

export default router;
