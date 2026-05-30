import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const stores = [
  { name: "АТБ", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/79/ATB-Market-logo.svg", city: "Київ", sourceUrl: "https://www.atbmarket.com" },
  { name: "Novus", logoUrl: "https://novus.ua/favicon.ico", city: "Київ", sourceUrl: "https://novus.zakaz.ua" },
  { name: "METRO", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/44/Metro_AG_Logo.svg", city: "Київ", sourceUrl: "https://metro.zakaz.ua" },
  { name: "Ашан", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/20/Auchan_Retail_logo.svg", city: "Київ", sourceUrl: "https://auchan.zakaz.ua" },
  { name: "Сільпо", logoUrl: "https://silpo.ua/favicon.ico", city: "Київ", sourceUrl: "https://silpo.ua" },
  { name: "Фора", logoUrl: "https://fora.ua/favicon.ico", city: "Київ", sourceUrl: "https://shop.fora.ua" },
  { name: "VARUS", logoUrl: "https://varus.ua/favicon.ico", city: "Київ", sourceUrl: "https://varus.ua" },
  { name: "Кишеня", logoUrl: "https://kishenya.ua/favicon.ico", city: "Київ", sourceUrl: "https://kishenya.ua" }
] as const;

type SeedProduct = {
  name: string;
  brand: string;
  category: string;
  barcode: string;
  unit: string;
  volume: string;
  description: string;
  sources: Record<string, string>;
};

const products: SeedProduct[] = [
  {
    name: "Вода мінеральна Моршинська негазована",
    brand: "Моршинська",
    category: "Напої",
    barcode: "4820017000024",
    unit: "шт",
    volume: "1.5 л",
    description: "Реальний товар із каталогів Novus, METRO та Ашан.",
    sources: {
      Novus: "https://novus.zakaz.ua/uk/products/voda-morshinska-1500ml--04820017000024/",
      METRO: "https://metro.zakaz.ua/uk/products/voda-morshinska-1500ml--04820017000024/",
      Ашан: "https://auchan.zakaz.ua/uk/products/voda-morshinska-1500ml--04820017000024/"
    }
  },
  {
    name: "Молоко Галичина ультрапастеризоване 2.5%",
    brand: "Галичина",
    category: "Молочні продукти",
    barcode: "4820038493812",
    unit: "шт",
    volume: "900 г",
    description: "Реальний товар із каталогів Novus, METRO та Ашан.",
    sources: {
      Novus: "https://novus.zakaz.ua/uk/products/moloko-galichina-900g-ukrayina--04820038493812/",
      METRO: "https://metro.zakaz.ua/uk/products/moloko-galichina-900g-ukrayina--04820038493812/",
      Ашан: "https://auchan.zakaz.ua/uk/products/moloko-galichina-900g-ukrayina--04820038493812/"
    }
  },
  {
    name: "Кефір Галичанський 2.5%",
    brand: "Галичанський",
    category: "Молочні продукти",
    barcode: "4820038493843",
    unit: "шт",
    volume: "900 г",
    description: "Реальний товар із каталогів Novus, METRO та Ашан.",
    sources: {
      Novus: "https://novus.zakaz.ua/uk/products/kefir-galichanskii-900g--04820038493843/",
      METRO: "https://metro.zakaz.ua/uk/products/kefir-galichanskii-900g--04820038493843/",
      Ашан: "https://auchan.zakaz.ua/uk/products/kefir-galichanskii-900g--04820038493843/"
    }
  },
  {
    name: "Молоко Яготинське безлактозне 2.5%",
    brand: "Яготинське",
    category: "Молочні продукти",
    barcode: "4823005210368",
    unit: "шт",
    volume: "900 г",
    description: "Реальний товар із каталогів Novus та Ашан.",
    sources: {
      Novus: "https://novus.zakaz.ua/uk/products/moloko-iagotin-900g-ukrayina--04823005210368/",
      Ашан: "https://auchan.zakaz.ua/uk/products/moloko-iagotin-900g-ukrayina--04823005210368/"
    }
  },
  {
    name: "Батон Київхліб Пшеничний нарізаний",
    brand: "Київхліб",
    category: "Хліб",
    barcode: "4823117506380",
    unit: "шт",
    volume: "500 г",
    description: "Реальний товар із каталогів Novus та Ашан.",
    sources: {
      Novus: "https://novus.zakaz.ua/uk/products/khlib-kiyivkhlib-500g-ukrayina--04823117506380/",
      Ашан: "https://auchan.zakaz.ua/uk/products/khlib-kiyivkhlib-500g-ukrayina--04823117506380/"
    }
  },
  {
    name: "Крупа гречана Жменька несмажена",
    brand: "Жменька",
    category: "Крупи",
    barcode: "4820038701832",
    unit: "шт",
    volume: "900 г",
    description: "Реальний товар із каталогу Ашан.",
    sources: {
      Ашан: "https://auchan.zakaz.ua/uk/products/krupa-grechka-zhmenka-900g--04820038701832/"
    }
  },
  {
    name: "Морозиво Ласунка стакан великан з какао та вареним згущеним молоком",
    brand: "Ласунка",
    category: "Морозиво",
    barcode: "113313",
    unit: "шт",
    volume: "100 г",
    description: "Реальний товар із каталогу АТБ.",
    sources: {
      АТБ: "https://www.atbmarket.com/product/morozivo-100g-lasunka-stakan-velikan-z-kakao-ta-varenim-zgusenim-molokom"
    }
  }
];

async function main() {
  await prisma.recipeItem.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.shoppingListItem.deleteMany();
  await prisma.shoppingList.deleteMany();
  await prisma.price.deleteMany();
  await prisma.productSource.deleteMany();
  await prisma.product.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: { email: "demo@example.com", passwordHash: await bcrypt.hash("password123", 10) }
  });

  const createdStores = await Promise.all(stores.map((store) => prisma.store.create({ data: store })));
  const storesByName = new Map(createdStores.map((store) => [store.name, store]));
  const createdProducts = [];

  for (const product of products) {
    const createdProduct = await prisma.product.create({
      data: {
        name: product.name,
        brand: product.brand,
        category: product.category,
        barcode: product.barcode,
        unit: product.unit,
        volume: product.volume,
        imageUrl: null,
        description: product.description
      }
    });

    createdProducts.push(createdProduct);

    for (const [storeName, sourceUrl] of Object.entries(product.sources)) {
      const store = storesByName.get(storeName);
      if (!store) continue;

      await prisma.productSource.create({
        data: {
          productId: createdProduct.id,
          storeId: store.id,
          sourceUrl
        }
      });

      if (product.barcode === "113313" && store.name === "АТБ") {
        const imageUrl = "https://src.zakaz.atbmarket.com/cache/photos/91949/catalog_product_main_91949.jpg";
        await prisma.price.create({
          data: {
            productId: createdProduct.id,
            storeId: store.id,
            price: 46.9,
            oldPrice: 46.9,
            discountPrice: 24.9,
            dateCollected: new Date(),
            isAvailable: true,
            imageUrl,
            sourceUrl
          }
        });

        await prisma.product.update({
          where: { id: createdProduct.id },
          data: { imageUrl }
        });
      }
    }
  }

  const demoList = await prisma.shoppingList.create({ data: { title: "Демо кошик", userId: user.id } });
  for (const product of createdProducts.slice(0, 4)) {
    await prisma.shoppingListItem.create({ data: { shoppingListId: demoList.id, productId: product.id, quantity: 1 } });
  }

  console.log("Seed completed with real product sources.");
  console.log("Run npm run monitor:prices -- 40 12 to import live prices, photos and current promotions.");
  console.log("Demo user: demo@example.com / password123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
