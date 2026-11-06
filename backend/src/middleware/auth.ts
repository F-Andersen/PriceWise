import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../prisma";

export type AuthRequest = Request & { userId?: string };

export function signToken(userId: string): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: "7d" });
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ message: "Authorization required" });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
    req.userId = payload.userId;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * Catalogue changes (products, stores, prices) are not part of the app; they are
 * allowed only for emails listed in ADMIN_EMAILS. With no admins configured,
 * these endpoints are closed.
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, async () => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } });
      if (!user || !config.adminEmails.includes(user.email.toLowerCase())) {
        return res.status(403).json({ message: "Admin access required" });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  });
}
