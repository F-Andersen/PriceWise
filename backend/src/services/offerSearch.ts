type SearchableOffer = {
  product: { name: string; brand: string; category: string };
  store: { name: string };
};

function normalize(text: string) {
  return text.toLowerCase().replace(/[ʼ’`]/g, "'");
}

/** Every word of the query must appear somewhere, in any order: "ашан кава зерна". */
export function matchesOfferQuery(offer: SearchableOffer, query: string) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const text = normalize(`${offer.product.name} ${offer.product.brand} ${offer.product.category} ${offer.store.name}`);
  return words.every((word) => text.includes(word));
}
