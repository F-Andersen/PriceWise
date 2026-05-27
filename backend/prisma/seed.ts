import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const stores = [
  { name: "АТБ", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/79/ATB-Market-logo.svg", city: "Київ", sourceUrl: "https://www.atbmarket.com" },
  { name: "Сільпо", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/6d/Silpo_logo.svg", city: "Київ", sourceUrl: "https://silpo.ua" },
  { name: "Novus", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/23/Novus_Ukraine_logo.svg", city: "Київ", sourceUrl: "https://novus.ua" },
  { name: "METRO", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/44/Metro_AG_Logo.svg", city: "Київ", sourceUrl: "https://metro.zakaz.ua" },
  { name: "Фора", logoUrl: "https://fora.ua/favicon.ico", city: "Київ", sourceUrl: "https://fora.ua" },
  { name: "Ашан", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/20/Auchan_Retail_logo.svg", city: "Київ", sourceUrl: "https://auchan.zakaz.ua" },
  { name: "Кишеня", logoUrl: "https://kishenya.ua/favicon.ico", city: "Київ", sourceUrl: "https://kishenya.ua" },
  { name: "VARUS", logoUrl: "https://varus.ua/favicon.ico", city: "Київ", sourceUrl: "https://varus.ua" }
] as const;

const productImages = {
  milk: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=900&q=80",
  cottageCheese: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=900&q=80",
  yogurt: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
  bread: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80",
  chicken: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=900&q=80",
  meat: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=900&q=80",
  sausage: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=900&q=80",
  carrot: "https://images.unsplash.com/photo-1447175008436-054170c2e979?auto=format&fit=crop&w=900&q=80",
  potato: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=80",
  onion: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=900&q=80",
  beetroot: "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&w=900&q=80",
  tomato: "https://images.unsplash.com/photo-1546470427-e26264be0b0d?auto=format&fit=crop&w=900&q=80",
  cucumber: "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=900&q=80",
  apple: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=900&q=80",
  banana: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=900&q=80",
  orange: "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&w=900&q=80",
  rice: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
  buckwheat: "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=900&q=80",
  oats: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=900&q=80",
  pasta: "https://images.unsplash.com/photo-1551462147-37885acc36f1?auto=format&fit=crop&w=900&q=80",
  water: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80",
  juice: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80",
  coffee: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80",
  tea: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80",
  dishSoap: "https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?auto=format&fit=crop&w=900&q=80",
  detergent: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=900&q=80",
  iceCream: "https://src.zakaz.atbmarket.com/cache/photos/91949/catalog_product_main_91949.jpg"
};

const products = [
  ["Молоко 2.5%", "Галичина", "Молочні продукти", "482000100001", "шт", "900 мл", productImages.milk, "moloko-25-galichina"],
  ["Молоко ультрапастеризоване", "Яготинське", "Молочні продукти", "482000100002", "шт", "950 мл", productImages.milk, "moloko-ultrapasterizovane-yagotinske"],
  ["Кефір 1%", "Слов'яночка", "Молочні продукти", "482000100003", "шт", "870 мл", productImages.yogurt, "kefir-1-slovyanochka"],
  ["Сир кисломолочний 5%", "President", "Молочні продукти", "482000100004", "шт", "300 г", productImages.cottageCheese, "sir-kislomolocnij-5-president"],
  ["Йогурт полуниця", "Активіа", "Молочні продукти", "482000100005", "шт", "290 г", productImages.yogurt, "jogurt-polunica-aktivia"],
  ["Хліб пшеничний", "Київхліб", "Хліб", "482000100006", "шт", "600 г", productImages.bread, "hlib-psenicnij-kiivhlib"],
  ["Хліб житній", "Кулиничі", "Хліб", "482000100007", "шт", "500 г", productImages.bread, "hlib-zitnij-kulinici"],
  ["Батон нарізний", "Київхліб", "Хліб", "482000100008", "шт", "450 г", productImages.bread, "baton-nariznij-kiivhlib"],
  ["Куряче філе", "Наша Ряба", "М'ясо", "482000100009", "кг", "1 кг", productImages.chicken, "kurace-file-nasa-ryaba"],
  ["Фарш свинячо-яловичий", "М'ясна Лавка", "М'ясо", "482000100010", "кг", "1 кг", productImages.meat, "fars-svinaco-yalovicij"],
  ["Ковбаса варена", "Глобино", "М'ясо", "482000100011", "шт", "500 г", productImages.sausage, "kovbasa-varena-globino"],
  ["Морква", "Фермерська", "Овочі", "482000100012", "кг", "1 кг", productImages.carrot, "morkva-fermerska"],
  ["Картопля", "Фермерська", "Овочі", "482000100013", "кг", "1 кг", productImages.potato, "kartopla-fermerska"],
  ["Цибуля ріпчаста", "Фермерська", "Овочі", "482000100014", "кг", "1 кг", productImages.onion, "cibula-ripcasta"],
  ["Буряк", "Фермерська", "Овочі", "482000100015", "кг", "1 кг", productImages.beetroot, "burak-fermerskij"],
  ["Помідори", "Фермерська", "Овочі", "482000100016", "кг", "1 кг", productImages.tomato, "pomidor-fermerskij"],
  ["Огірки", "Фермерська", "Овочі", "482000100017", "кг", "1 кг", productImages.cucumber, "ogirki-fermerski"],
  ["Яблука Голден", "Українські сади", "Фрукти", "482000100018", "кг", "1 кг", productImages.apple, "abluka-golden"],
  ["Банани", "Import", "Фрукти", "482000100019", "кг", "1 кг", productImages.banana, "banani"],
  ["Апельсини", "Import", "Фрукти", "482000100020", "кг", "1 кг", productImages.orange, "apelsini"],
  ["Рис довгозернистий", "Жменька", "Крупи", "482000100021", "шт", "1 кг", productImages.rice, "ris-dovgozernistij-zmenka"],
  ["Гречка ядриця", "Хуторок", "Крупи", "482000100022", "шт", "1 кг", productImages.buckwheat, "grecka-adricia-hutorok"],
  ["Вівсяні пластівці", "Nordic", "Крупи", "482000100023", "шт", "600 г", productImages.oats, "vivsani-plastivci-nordic"],
  ["Макарони спагеті", "Чумак", "Крупи", "482000100024", "шт", "400 г", productImages.pasta, "makaroni-spageti-cumak"],
  ["Вода негазована", "Моршинська", "Напої", "482000100025", "шт", "1.5 л", productImages.water, "voda-negazovana-morsinska"],
  ["Сік яблучний", "Sandora", "Напої", "482000100026", "шт", "1 л", productImages.juice, "sik-ablucnij-sandora"],
  ["Кава мелена", "Jacobs", "Кава/чай", "482000100027", "шт", "225 г", productImages.coffee, "kava-melena-jacobs"],
  ["Чай чорний", "Ahmad", "Кава/чай", "482000100028", "шт", "100 пак.", productImages.tea, "caj-cornij-ahmad"],
  ["Засіб для миття посуду", "Fairy", "Побутова хімія", "482000100029", "шт", "500 мл", productImages.dishSoap, "zasib-dla-mitta-posudu-fairy"],
  ["Пральний порошок", "Ariel", "Побутова хімія", "482000100030", "шт", "3 кг", productImages.detergent, "pralnij-porosok-ariel"],
  ["Морозиво стакан великан з какао", "Ласунка", "Морозиво", "482000100031", "шт", "100 г", productImages.iceCream, "morozivo-100g-lasunka-stakan-velikan-z-kakao-ta-varenim-zgusenim-molokom"]
] as const;

const basePrices = [
  38, 42, 35, 78, 31, 26, 29, 24, 198, 176, 112, 18, 16, 20, 17, 64, 59, 34, 57, 62, 76, 72, 86, 44, 22, 58, 149, 128, 63, 319, 32
];

const storePriceDeltas = [-0.04, 0.05, 0.09, -0.01, 0.02, 0.03, 0.07, 0.0];

function productSourceUrl(productName: string, storeName: string) {
  if (productName === "Морозиво стакан великан з какао" && storeName === "АТБ") {
    return "https://www.atbmarket.com/product/morozivo-100g-lasunka-stakan-velikan-z-kakao-ta-varenim-zgusenim-molokom";
  }

  return null;
}

async function main() {
  await prisma.recipeItem.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.shoppingListItem.deleteMany();
  await prisma.shoppingList.deleteMany();
  await prisma.price.deleteMany();
  await prisma.product.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: { email: "demo@example.com", passwordHash: await bcrypt.hash("password123", 10) }
  });

  const createdStores = await Promise.all(stores.map((store) => prisma.store.create({ data: store })));
  const createdProducts = await Promise.all(
    products.map(([name, brand, category, barcode, unit, volume, imageUrl]) =>
      prisma.product.create({
        data: {
          name,
          brand,
          category,
          barcode,
          unit,
          volume,
          imageUrl,
          description: `${name} ${brand}. Тестовий товар для демонстрації аналізу цін.`
        }
      })
    )
  );

  const dates = [28, 14, 7, 0].map((daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
  });

  for (const [productIndex, product] of createdProducts.entries()) {
    const [, , , , , , imageUrl] = products[productIndex];
    for (const [storeIndex, store] of createdStores.entries()) {
      for (const [dateIndex, dateCollected] of dates.entries()) {
        const base = basePrices[productIndex];
        const storeDelta = storePriceDeltas[storeIndex] ?? 0;
        const historicalDelta = (dateIndex - 2) * 0.025;
        const price = Math.round(base * (1 + storeDelta + historicalDelta) * 100) / 100;
        const hasDiscount = dateIndex === dates.length - 1 && (productIndex + storeIndex) % 5 === 0;
        await prisma.price.create({
          data: {
            productId: product.id,
            storeId: store.id,
            price,
            oldPrice: hasDiscount ? Math.round(price * 1.14 * 100) / 100 : null,
            discountPrice: hasDiscount ? Math.round(price * 0.9 * 100) / 100 : null,
            dateCollected,
            isAvailable: !((productIndex + storeIndex) % 23 === 0 && dateIndex === dates.length - 1),
            imageUrl,
            sourceUrl: productSourceUrl(product.name, store.name)
          }
        });
      }
    }
  }

  const byName = new Map(createdProducts.map((product) => [product.name, product]));
  const recipes = [
    {
      title: "Борщ",
      description: "Класична страва з овочами та м'ясом.",
      names: ["Буряк", "Картопля", "Морква", "Цибуля ріпчаста", "Фарш свинячо-яловичий"],
      imageUrl: "https://images.unsplash.com/photo-1589118949245-7d38baf380d6?auto=format&fit=crop&w=900&q=80"
    },
    {
      title: "Омлет",
      description: "Швидкий сніданок із молоком та овочами.",
      names: ["Молоко 2.5%", "Помідори", "Хліб пшеничний"],
      imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80"
    },
    {
      title: "Паста",
      description: "Проста вечеря з макаронами та куркою.",
      names: ["Макарони спагеті", "Куряче філе", "Помідори"],
      imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=80"
    },
    {
      title: "Салат",
      description: "Легкий овочево-фруктовий салат.",
      names: ["Огірки", "Помідори", "Яблука Голден"],
      imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80"
    },
    {
      title: "Курка з гарніром",
      description: "Куряче філе з гречкою та овочами.",
      names: ["Куряче філе", "Гречка ядриця", "Морква", "Цибуля ріпчаста"],
      imageUrl: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=900&q=80"
    }
  ];

  for (const recipe of recipes) {
    await prisma.recipe.create({
      data: {
        title: recipe.title,
        description: recipe.description,
        imageUrl: recipe.imageUrl,
        items: {
          create: recipe.names.map((name, index) => ({
            productId: byName.get(name)!.id,
            quantity: index === 0 ? 2 : 1
          }))
        }
      }
    });
  }

  const demoList = await prisma.shoppingList.create({ data: { title: "Демо кошик", userId: user.id } });
  for (const productName of ["Молоко 2.5%", "Хліб пшеничний", "Куряче філе", "Гречка ядриця", "Яблука Голден"]) {
    await prisma.shoppingListItem.create({ data: { shoppingListId: demoList.id, productId: byName.get(productName)!.id, quantity: 1 } });
  }

  console.log("Seed completed. Demo user: demo@example.com / password123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
