import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const stores = [
  { name: "АТБ", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/79/ATB-Market-logo.svg", city: "Київ", sourceUrl: "https://www.atbmarket.com" },
  { name: "Сільпо", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/6d/Silpo_logo.svg", city: "Київ", sourceUrl: "https://silpo.ua" },
  { name: "Novus", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/23/Novus_Ukraine_logo.svg", city: "Київ", sourceUrl: "https://novus.ua" }
];

const products = [
  ["Молоко 2.5%", "Галичина", "Молочні продукти", "482000100001", "шт", "900 мл"],
  ["Молоко ультрапастеризоване", "Яготинське", "Молочні продукти", "482000100002", "шт", "950 мл"],
  ["Кефір 1%", "Слов'яночка", "Молочні продукти", "482000100003", "шт", "870 мл"],
  ["Сир кисломолочний 5%", "President", "Молочні продукти", "482000100004", "шт", "300 г"],
  ["Йогурт полуниця", "Активіа", "Молочні продукти", "482000100005", "шт", "290 г"],
  ["Хліб пшеничний", "Київхліб", "Хліб", "482000100006", "шт", "600 г"],
  ["Хліб житній", "Кулиничі", "Хліб", "482000100007", "шт", "500 г"],
  ["Батон нарізний", "Київхліб", "Хліб", "482000100008", "шт", "450 г"],
  ["Куряче філе", "Наша Ряба", "М'ясо", "482000100009", "кг", "1 кг"],
  ["Фарш свинячо-яловичий", "М'ясна Лавка", "М'ясо", "482000100010", "кг", "1 кг"],
  ["Ковбаса варена", "Глобино", "М'ясо", "482000100011", "шт", "500 г"],
  ["Морква", "Фермерська", "Овочі", "482000100012", "кг", "1 кг"],
  ["Картопля", "Фермерська", "Овочі", "482000100013", "кг", "1 кг"],
  ["Цибуля ріпчаста", "Фермерська", "Овочі", "482000100014", "кг", "1 кг"],
  ["Буряк", "Фермерська", "Овочі", "482000100015", "кг", "1 кг"],
  ["Помідори", "Фермерська", "Овочі", "482000100016", "кг", "1 кг"],
  ["Огірки", "Фермерська", "Овочі", "482000100017", "кг", "1 кг"],
  ["Яблука Голден", "Українські сади", "Фрукти", "482000100018", "кг", "1 кг"],
  ["Банани", "Import", "Фрукти", "482000100019", "кг", "1 кг"],
  ["Апельсини", "Import", "Фрукти", "482000100020", "кг", "1 кг"],
  ["Рис довгозернистий", "Жменька", "Крупи", "482000100021", "шт", "1 кг"],
  ["Гречка ядриця", "Хуторок", "Крупи", "482000100022", "шт", "1 кг"],
  ["Вівсяні пластівці", "Nordic", "Крупи", "482000100023", "шт", "600 г"],
  ["Макарони спагеті", "Чумак", "Крупи", "482000100024", "шт", "400 г"],
  ["Вода негазована", "Моршинська", "Напої", "482000100025", "шт", "1.5 л"],
  ["Сік яблучний", "Sandora", "Напої", "482000100026", "шт", "1 л"],
  ["Кава мелена", "Jacobs", "Кава/чай", "482000100027", "шт", "225 г"],
  ["Чай чорний", "Ahmad", "Кава/чай", "482000100028", "шт", "100 пак."],
  ["Засіб для миття посуду", "Fairy", "Побутова хімія", "482000100029", "шт", "500 мл"],
  ["Пральний порошок", "Ariel", "Побутова хімія", "482000100030", "шт", "3 кг"]
] as const;

const basePrices = [
  38, 42, 35, 78, 31, 26, 29, 24, 198, 176, 112, 18, 16, 20, 17, 64, 59, 34, 57, 62, 76, 72, 86, 44, 22, 58, 149, 128, 63, 319
];

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
    products.map(([name, brand, category, barcode, unit, volume]) =>
      prisma.product.create({
        data: {
          name,
          brand,
          category,
          barcode,
          unit,
          volume,
          imageUrl: `https://placehold.co/600x400/eaf7ef/176d45?text=${encodeURIComponent(name)}`,
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
    for (const [storeIndex, store] of createdStores.entries()) {
      for (const [dateIndex, dateCollected] of dates.entries()) {
        const base = basePrices[productIndex];
        const storeDelta = storeIndex === 0 ? -0.04 : storeIndex === 1 ? 0.05 : 0.09;
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
            isAvailable: !((productIndex + storeIndex) % 17 === 0 && dateIndex === dates.length - 1)
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
      names: ["Буряк", "Картопля", "Морква", "Цибуля ріпчаста", "Фарш свинячо-яловичий"]
    },
    {
      title: "Омлет",
      description: "Швидкий сніданок із молоком та овочами.",
      names: ["Молоко 2.5%", "Помідори", "Хліб пшеничний"]
    },
    {
      title: "Паста",
      description: "Проста вечеря з макаронами та куркою.",
      names: ["Макарони спагеті", "Куряче філе", "Помідори"]
    },
    {
      title: "Салат",
      description: "Легкий овочево-фруктовий салат.",
      names: ["Огірки", "Помідори", "Яблука Голден"]
    },
    {
      title: "Курка з гарніром",
      description: "Куряче філе з гречкою та овочами.",
      names: ["Куряче філе", "Гречка ядриця", "Морква", "Цибуля ріпчаста"]
    }
  ];

  for (const recipe of recipes) {
    await prisma.recipe.create({
      data: {
        title: recipe.title,
        description: recipe.description,
        imageUrl: `https://placehold.co/600x400/e8f1ff/1b5fbf?text=${encodeURIComponent(recipe.title)}`,
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
