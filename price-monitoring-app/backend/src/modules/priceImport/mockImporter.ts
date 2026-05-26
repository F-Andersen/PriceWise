import { prisma } from "../../prisma";

export async function importMockPrices() {
  const count = await prisma.price.count();
  return {
    imported: 0,
    existingPrices: count,
    message: "MVP-заглушка: у майбутньому тут буде price monitoring service або парсер CSV/JSON."
  };
}
