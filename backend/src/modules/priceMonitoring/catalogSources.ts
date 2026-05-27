export type CatalogSource = {
  storeName: string;
  promotionsUrl: string;
  productUrlPattern: string;
  refreshEveryHours: number;
};

export const catalogSources: CatalogSource[] = [
  {
    storeName: "АТБ",
    promotionsUrl: "https://www.atbmarket.com/akcii",
    productUrlPattern: "https://www.atbmarket.com/product/{slug}",
    refreshEveryHours: 2
  },
  {
    storeName: "Сільпо",
    promotionsUrl: "https://silpo.ua/offers",
    productUrlPattern: "https://silpo.ua/product/{slug}",
    refreshEveryHours: 2
  },
  {
    storeName: "Novus",
    promotionsUrl: "https://novus.ua/promotions",
    productUrlPattern: "https://novus.ua/product/{slug}",
    refreshEveryHours: 2
  },
  {
    storeName: "METRO",
    promotionsUrl: "https://metro.zakaz.ua/uk/actions/",
    productUrlPattern: "https://metro.zakaz.ua/uk/products/{slug}/",
    refreshEveryHours: 4
  },
  {
    storeName: "Фора",
    promotionsUrl: "https://fora.ua/actions",
    productUrlPattern: "https://fora.ua/product/{slug}",
    refreshEveryHours: 3
  },
  {
    storeName: "Ашан",
    promotionsUrl: "https://auchan.zakaz.ua/uk/actions/",
    productUrlPattern: "https://auchan.zakaz.ua/uk/products/{slug}/",
    refreshEveryHours: 4
  },
  {
    storeName: "Кишеня",
    promotionsUrl: "https://kishenya.ua/actions",
    productUrlPattern: "https://kishenya.ua/product/{slug}",
    refreshEveryHours: 4
  },
  {
    storeName: "VARUS",
    promotionsUrl: "https://varus.ua/akcii",
    productUrlPattern: "https://varus.ua/product/{slug}",
    refreshEveryHours: 3
  }
];
