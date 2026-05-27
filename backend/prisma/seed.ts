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
];

const products = [
  ["Молоко 2.5%", "Галичина", "Молочні продукти", "482000100001", "шт", "900 мл", "milk,bottle"],
  ["Молоко ультрапастеризоване", "Яготинське", "Молочні продукти", "482000100002", "шт", "950 мл", "milk,carton"],
  ["Кефір 1%", "Слов'яночка", "Молочні продукти", "482000100003", "шт", "870 мл", "kefir,yogurt"],
  ["Сир кисломолочний 5%", "President", "Молочні продукти", "482000100004", "шт", "300 г", "cottage-cheese,dairy"],
  ["Йогурт полуниця", "Активіа", "Молочні продукти", "482000100005", "шт", "290 г", "strawberry,yogurt"],
  ["Хліб пшеничний", "Київхліб", "Хліб", "482000100006", "шт", "600 г", "bread,loaf"],
  ["Хліб житній", "Кулиничі", "Хліб", "482000100007", "шт", "500 г", "rye,bread"],
  ["Батон нарізний", "Київхліб", "Хліб", "482000100008", "шт", "450 г", "baguette,bread"],
  ["Куряче філе", "Наша Ряба", "М'ясо", "482000100009", "кг", "1 кг", "chicken,fillet"],
  ["Фарш свинячо-яловичий", "М'ясна Лавка", "М'ясо", "482000100010", "кг", "1 кг", "minced-meat"],
  ["Ковбаса варена", "Глобино", "М'ясо", "482000100011", "шт", "500 г", "sausage"],
  ["Морква", "Фермерська", "Овочі", "482000100012", "кг", "1 кг", "carrot"],
  ["Картопля", "Фермерська", "Овочі", "482000100013", "кг", "1 кг", "potato"],
  ["Цибуля ріпчаста", "Фермерська", "Овочі", "482000100014", "кг", "1 кг", "onion"],
  ["Буряк", "Фермерська", "Овочі", "482000100015", "кг", "1 кг", "beetroot"],
  ["Помідори", "Фермерська", "Овочі", "482000100016", "кг", "1 кг", "tomato"],
  ["Огірки", "Фермерська", "Овочі", "482000100017", "кг", "1 кг", "cucumber"],
  ["Яблука Голден", "Українські сади", "Фрукти", "482000100018", "кг", "1 кг", "apple"],
  ["Банани", "Import", "Фрукти", "482000100019", "кг", "1 кг", "banana"],
  ["Апельсини", "Import", "Фрукти", "482000100020", "кг", "1 кг", "orange"],
  ["Рис довгозернистий", "Жменька", "Крупи", "482000100021", "шт", "1 кг", "rice,bag"],
  ["Гречка ядриця", "Хуторок", "Крупи", "482000100022", "шт", "1 кг", "buckwheat"],
  ["Вівсяні пластівці", "Nordic", "Крупи", "482000100023", "шт", "600 г", "oats"],
  ["Макарони спагеті", "Чумак", "Крупи", "482000100024", "шт", "400 г", "spaghetti,pasta"],
  ["Вода негазована", "Моршинська", "Напої", "482000100025", "шт", "1.5 л", "water,bottle"],
  ["Сік яблучний", "Sandora", "Напої", "482000100026", "шт", "1 л", "apple,juice"],
  ["Кава мелена", "Jacobs", "Кава/чай", "482000100027", "шт", "225 г", "coffee,package"],
  ["Чай чорний", "Ahmad", "Кава/чай", "482000100028", "шт", "100 пак.", "tea,box"],
  ["Засіб для миття посуду", "Fairy", "Побутова хімія", "482000100029", "шт", "500 мл", "dish-soap"],
  ["Пральний порошок", "Ariel", "Побутова хімія", "482000100030", "шт", "3 кг", "laundry,detergent"]
] as const;

const basePrices = [
  38, 42, 35, 78, 31, 26, 29, 24, 198, 176, 112, 18, 16, 20, 17, 64, 59, 34, 57, 62, 76, 72, 86, 44, 22, 58, 149, 128, 63, 319
];

const storePriceDeltas = [-0.04, 0.05, 0.09, -0.01, 0.02, 0.03, 0.07, 0.0];

function productPhoto(tags: string, productIndex: number, storeIndex = 0) {
  const lock = 1100 + productIndex * 17 + storeIndex;
  return `https://loremflickr.com/600/400/${tags}?lock=${lock}`;
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
    products.map(([name, brand, category, barcode, unit, volume, photoTags], productIndex) =>
      prisma.product.create({
        data: {
          name,
          brand,
          category,
          barcode,
          unit,
          volume,
          imageUrl: productPhoto(photoTags, productIndex),
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
    const photoTags = products[productIndex][6];
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
            imageUrl: productPhoto(photoTags, productIndex, storeIndex)
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
      imageUrl: "https://loremflickr.com/600/400/borscht,soup?lock=2101"
    },
    {
      title: "Омлет",
      description: "Швидкий сніданок із молоком та овочами.",
      names: ["Молоко 2.5%", "Помідори", "Хліб пшеничний"],
      imageUrl: "https://loremflickr.com/600/400/omelette,breakfast?lock=2102"
    },
    {
      title: "Паста",
      description: "Проста вечеря з макаронами та куркою.",
      names: ["Макарони спагеті", "Куряче філе", "Помідори"],
      imageUrl: "https://loremflickr.com/600/400/pasta,dinner?lock=2103"
    },
    {
      title: "Салат",
      description: "Легкий овочево-фруктовий салат.",
      names: ["Огірки", "Помідори", "Яблука Голден"],
      imageUrl: "https://loremflickr.com/600/400/salad,vegetables?lock=2104"
    },
    {
      title: "Курка з гарніром",
      description: "Куряче філе з гречкою та овочами.",
      names: ["Куряче філе", "Гречка ядриця", "Морква", "Цибуля ріпчаста"],
      imageUrl: "https://loremflickr.com/600/400/chicken,dinner?lock=2105"
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
