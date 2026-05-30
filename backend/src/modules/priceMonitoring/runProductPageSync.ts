import { syncProductPages } from "./productPageSync";
import { syncPromotionPages } from "./promotionPageSync";

const limitArg = Number(process.argv[2]);
const promoLimitArg = Number(process.argv[3]);

async function main() {
  const productResults = await syncProductPages(Number.isFinite(limitArg) ? limitArg : 20);
  const promotionResults = await syncPromotionPages(Number.isFinite(promoLimitArg) ? promoLimitArg : 12);

  console.log("Product page sync");
  console.table(productResults);
  console.log("Promotion page sync");
  console.table(promotionResults);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
