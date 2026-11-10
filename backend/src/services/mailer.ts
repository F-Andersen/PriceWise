import nodemailer from "nodemailer";
import { config } from "../config";
import { RESET_CODE_TTL_MS } from "./passwordReset";

const transport = config.mail
  ? nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.port === 465,
      auth: { user: config.mail.user, pass: config.mail.password }
    })
  : null;

/** Without mail settings production cannot deliver a code; development prints it instead. */
export function canDeliverMail() {
  return transport !== null || !config.isProduction;
}

export async function sendPasswordResetCode(email: string, code: string) {
  if (!transport) {
    console.log(`[mail] password reset code for ${email}: ${code}`);
    return;
  }
  const minutes = RESET_CODE_TTL_MS / 60000;
  await transport.sendMail({
    from: config.mail!.from,
    to: email,
    subject: `Код для зміни пароля PriceWise: ${code}`,
    text: `Ваш код для зміни пароля: ${code}\n\nВін діє ${minutes} хвилин. Якщо ви не просили змінити пароль, просто проігноруйте цей лист.`
  });
}
