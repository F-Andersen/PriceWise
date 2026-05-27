import { catalogSources } from "./catalogSources";

export async function syncPromotionsFromSources() {
  return catalogSources.map((source) => ({
    storeName: source.storeName,
    promotionsUrl: source.promotionsUrl,
    status: "stub",
    message: "Parser placeholder: replace this with Playwright/Cheerio parsing for live promotions."
  }));
}
