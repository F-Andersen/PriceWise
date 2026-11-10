import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { config } from "../config";
import { AuthRequest, requireAuth, signToken } from "../middleware/auth";
import { prisma } from "../prisma";
import { canDeliverMail, sendPasswordResetCode } from "../services/mailer";
import { canResendResetCode, generateResetCode, hashResetCode, isResetCodeCorrect, MAX_RESET_ATTEMPTS, RESET_CODE_TTL_MS } from "../services/passwordReset";

const router = Router();
const password = z.string().min(6);
const credentialsSchema = z.object({ email: z.string().email(), password });

const INVALID_RESET = "Невірний або застарілий код. Спробуйте ще раз або запросіть новий.";

router.post("/register", async (req, res) => {
  const data = credentialsSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return res.status(409).json({ message: "Користувач із такою поштою вже існує. Увійдіть або скиньте пароль." });

  const user = await prisma.user.create({
    data: { email: data.email, passwordHash: await bcrypt.hash(data.password, 10) },
    select: { id: true, email: true, createdAt: true, tokenVersion: true }
  });

  res.status(201).json({ user: { id: user.id, email: user.email, createdAt: user.createdAt }, token: signToken(user.id, user.tokenVersion) });
});

router.post("/login", async (req, res) => {
  const data = credentialsSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
    return res.status(401).json({ message: "Невірна пошта або пароль." });
  }

  res.json({
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
    token: signToken(user.id, user.tokenVersion)
  });
});

/** The answer is the same whether or not the account exists, and does not wait for the mail. */
router.post("/forgot-password", async (req, res) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  if (!canDeliverMail()) return res.status(503).json({ message: "Відновлення пароля тимчасово недоступне." });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordReset: { select: { createdAt: true } } } });
  if (user && canResendResetCode(user.passwordReset?.createdAt)) {
    const code = generateResetCode();
    const data = { codeHash: hashResetCode(code, config.jwtSecret), expiresAt: new Date(Date.now() + RESET_CODE_TTL_MS), attempts: 0, createdAt: new Date() };
    await prisma.passwordReset.upsert({ where: { userId: user.id }, update: data, create: { ...data, userId: user.id } });
    sendPasswordResetCode(email, code).catch((error) => console.error("Password reset mail failed", error));
  }
  res.json({ ok: true });
});

router.post("/reset-password", async (req, res) => {
  const data = z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/), password }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email }, include: { passwordReset: true } });
  if (!user?.passwordReset) return res.status(400).json({ message: INVALID_RESET });

  // Counted before the comparison, so parallel guesses cannot pass the limit.
  const counted = await prisma.passwordReset.updateMany({
    where: { userId: user.id, attempts: { lt: MAX_RESET_ATTEMPTS }, expiresAt: { gt: new Date() } },
    data: { attempts: { increment: 1 } }
  });
  if (counted.count === 0 || !isResetCodeCorrect(data.code, user.passwordReset.codeHash, config.jwtSecret)) {
    return res.status(400).json({ message: INVALID_RESET });
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const [updated] = await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash, tokenVersion: { increment: 1 } } }),
    prisma.passwordReset.delete({ where: { userId: user.id } })
  ]);
  res.json({ user: { id: updated.id, email: updated.email, createdAt: updated.createdAt }, token: signToken(updated.id, updated.tokenVersion) });
});

/** Ends the user's other sessions; this device gets a fresh token and stays signed in. */
router.post("/change-password", requireAuth, async (req: AuthRequest, res) => {
  const data = z.object({ currentPassword: z.string().min(1), newPassword: password }).parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
    return res.status(400).json({ message: "Поточний пароль введено неправильно." });
  }
  if (data.currentPassword === data.newPassword) {
    return res.status(400).json({ message: "Новий пароль має відрізнятися від поточного." });
  }

  const passwordHash = await bcrypt.hash(data.newPassword, 10);
  const [updated] = await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash, tokenVersion: { increment: 1 } } }),
    prisma.passwordReset.deleteMany({ where: { userId: user.id } })
  ]);
  res.json({ token: signToken(updated.id, updated.tokenVersion) });
});

export default router;
