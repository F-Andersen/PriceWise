import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthRequest = Request & { userId?: string };

export function signToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "7d" });
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ message: "Authorization token is required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret") as { userId: string };
    req.userId = payload.userId;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
