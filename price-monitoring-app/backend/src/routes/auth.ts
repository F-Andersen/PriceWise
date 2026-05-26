import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { signToken } from "../middleware/auth";

const router = Router();
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

router.post("/register", async (req, res) => {
  const data = credentialsSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return res.status(409).json({ message: "User already exists" });

  const user = await prisma.user.create({
    data: { email: data.email, passwordHash: await bcrypt.hash(data.password, 10) },
    select: { id: true, email: true, createdAt: true }
  });

  res.status(201).json({ user, token: signToken(user.id) });
});

router.post("/login", async (req, res) => {
  const data = credentialsSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  res.json({
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
    token: signToken(user.id)
  });
});

export default router;
