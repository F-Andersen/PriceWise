import { syncPromotionsFromSources } from "./syncPromotions";

syncPromotionsFromSources()
  .then((results) => {
    console.table(results);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
