export const MIN_PASSWORD_LENGTH = 6;

export function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email.trim());
}

/** Returns what is wrong with a new password, or null when it can be sent. */
export function newPasswordProblem(password: string, repeat: string) {
  if (password.length < MIN_PASSWORD_LENGTH) return `Пароль має містити щонайменше ${MIN_PASSWORD_LENGTH} символів.`;
  if (password !== repeat) return "Паролі не збігаються.";
  return null;
}

export function authErrorMessage(reason: unknown) {
  const message = reason instanceof Error ? reason.message : "";
  if (!message || message === "Failed to fetch" || message === "Network request failed") {
    return "Немає зв'язку із сервером. Перевірте інтернет і спробуйте ще раз.";
  }
  if (message === "Invalid request") return `Перевірте введені дані. Пароль має містити щонайменше ${MIN_PASSWORD_LENGTH} символів.`;
  return message;
}
