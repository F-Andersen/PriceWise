import { syncProductPages } from "./productPageSync";

const limitArg = Number(process.argv[2]);

syncProductPages(Number.isFinite(limitArg) ? limitArg : 20)
  .then((results) => {
    console.table(results);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
