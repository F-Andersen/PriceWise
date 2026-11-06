import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";

export type PriceObservation = {
  productId: string;
  storeId: string;
  price: number | Prisma.Decimal;
  oldPrice?: number | Prisma.Decimal | null;
  discountPrice?: number | Prisma.Decimal | null;
  promoEndsAt?: Date | null;
  isAvailable: boolean;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  seenAt: Date;
};

const decimal = (value: number | Prisma.Decimal | null | undefined) =>
  value === null || value === undefined ? null : new Prisma.Decimal(value);

const sameDecimal = (a: Prisma.Decimal | null, b: Prisma.Decimal | null) => (a === null || b === null ? a === b : a.equals(b));

/**
 * Stores what a collection saw, keeping the history compact.
 *
 * If the latest row for this product and store has the same price, discount,
 * promotion end and availability, only its lastSeenAt moves forward (plus photo
 * and link, which are not history). Otherwise a new row starts a new period.
 * So the table grows with the number of price changes, not with the number of
 * collections.
 */
export async function recordPriceObservation(observation: PriceObservation): Promise<"created" | "extended"> {
  const price = new Prisma.Decimal(observation.price);
  const oldPrice = decimal(observation.oldPrice);
  const discountPrice = decimal(observation.discountPrice);
  const promoEndsAt = observation.promoEndsAt ?? null;

  const latest = await prisma.price.findFirst({
    where: { productId: observation.productId, storeId: observation.storeId },
    orderBy: [{ dateCollected: "desc" }, { id: "desc" }]
  });

  const unchanged =
    latest &&
    latest.isAvailable === observation.isAvailable &&
    sameDecimal(latest.price, price) &&
    sameDecimal(latest.oldPrice, oldPrice) &&
    sameDecimal(latest.discountPrice, discountPrice) &&
    (latest.promoEndsAt?.getTime() ?? null) === (promoEndsAt?.getTime() ?? null);

  if (latest && unchanged) {
    await prisma.price.update({
      where: { id: latest.id },
      data: {
        lastSeenAt: observation.seenAt > latest.lastSeenAt ? observation.seenAt : latest.lastSeenAt,
        imageUrl: observation.imageUrl ?? latest.imageUrl,
        sourceUrl: observation.sourceUrl ?? latest.sourceUrl
      }
    });
    return "extended";
  }

  await prisma.price.create({
    data: {
      productId: observation.productId,
      storeId: observation.storeId,
      price,
      oldPrice,
      discountPrice,
      promoEndsAt,
      isAvailable: observation.isAvailable,
      imageUrl: observation.imageUrl ?? null,
      sourceUrl: observation.sourceUrl ?? null,
      dateCollected: observation.seenAt,
      lastSeenAt: observation.seenAt
    }
  });
  return "created";
}

/**
 * Deletes price periods that ended more than `retentionDays` ago. The latest row
 * of every product and store is always kept, however old, so current state is
 * never lost. Returns the number of deleted rows.
 */
export async function pruneOldPriceHistory(retentionDays: number): Promise<number> {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return 0;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  return prisma.$executeRaw`
    DELETE FROM "Price" p
    WHERE p."lastSeenAt" < ${cutoff}
      AND EXISTS (
        SELECT 1 FROM "Price" newer
        WHERE newer."productId" = p."productId"
          AND newer."storeId" = p."storeId"
          AND (newer."dateCollected", newer.id) > (p."dateCollected", p.id)
      )
  `;
}
