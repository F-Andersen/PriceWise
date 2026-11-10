/**
 * Starter recipes. They are copied into the database once, by slug; after that the
 * database is the source of truth, and a recipe added there is matched the same way.
 * The first ingredient gives the recipe its picture.
 */

type Rule = { categories: string[]; includeTerms: string[]; excludeTerms: string[] };
type IngredientDraft = Rule & { name: string; amount: number; unit: "г" | "мл" | "шт"; optional?: boolean };

export type RecipeDraft = {
  slug: string;
  title: string;
  description: string;
  durationMinutes: number;
  servings: number;
  difficulty: "Легко" | "Середньо";
  steps: string[];
  ingredients: IngredientDraft[];
};

const DAIRY = ["Молочні продукти"];
const VEGETABLES = ["Овочі"];

const milk: Rule = {
  categories: DAIRY,
  includeTerms: ["молоко"],
  excludeTerms: ["згущ", "кокос", "вівс", "мигдал", "соєв", "рисов", "сухе", "козяч", "шоколад", "какао", "банан", "полуниц", "дитяч", "безлактоз", "бариста"]
};
const butter: Rule = {
  categories: DAIRY,
  includeTerms: ["масло"],
  excludeTerms: ["оливк", "соняшн", "спред", "кокос", "топлен", "арахіс", "гарбуз", "часник", "зелен", "шоколад", "какао", "безлактоз", "козяч"]
};
const eggs: Rule = { categories: DAIRY, includeTerms: ["яйця курячі", "яйце куряче"], excludeTerms: ["мінімальне", "органічн"] };
const frying: Rule = { categories: ["Бакалія"], includeTerms: ["олія соняшникова", "олія оливкова"], excludeTerms: ["спрей", "часник", "перець", "базилік", "трюфел"] };
const oliveOil: Rule = { ...frying, includeTerms: ["олія оливкова"], excludeTerms: [...frying.excludeTerms, "жмихов", "лимон", "екстракційн", "sansa", "pomace"] };
const sweetPepper: Rule = { categories: VEGETABLES, includeTerms: ["перець"], excludeTerms: ["чилі", "гострий", "маринов", "фарширов", "печен", "халапеньо"] };
const cabbage: Rule = {
  categories: VEGETABLES,
  includeTerms: ["капуста"],
  excludeTerms: ["квашен", "цвітн", "брокол", "пекін", "червон", "брюссел", "савой", "кольраб", "морськ", "салат", "маринов", "тушкован", "китайськ"]
};

export const RECIPE_CATALOG: RecipeDraft[] = [
  {
    slug: "avokado-tost",
    title: "Авокадо-тост",
    description: "Швидкий сніданок із батоном, авокадо та вершковим сиром.",
    durationMinutes: 10,
    servings: 2,
    difficulty: "Легко",
    steps: [
      "Підсушіть скибки батона на сухій пательні або в тостері до легкої скоринки.",
      "Розімніть авокадо виделкою, додайте дрібку солі.",
      "Намастіть тост вершковим сиром, зверху викладіть авокадо.",
      "Подавайте одразу, поки тост хрусткий."
    ],
    ingredients: [
      { name: "Авокадо", amount: 1, unit: "шт", categories: ["Фрукти"], includeTerms: ["авокадо"], excludeTerms: ["заморож", "пюре", "соус"] },
      { name: "Батон", amount: 150, unit: "г", categories: ["Хліб"], includeTerms: ["батон"], excludeTerms: ["кунжут", "родзин", "солодк", "шоколад", "гарбуз"] },
      { name: "Вершковий крем-сир", amount: 60, unit: "г", categories: DAIRY, includeTerms: ["крем-сир"], excludeTerms: ["трав", "зелен", "шинк", "гриб", "лосос", "часник", "кріп", "безлактоз", "огірк"] }
    ]
  },
  {
    slug: "hrechana-kasha",
    title: "Гречана каша з молоком",
    description: "Недорогий сніданок із гречки, молока та вершкового масла.",
    durationMinutes: 25,
    servings: 2,
    difficulty: "Легко",
    steps: [
      "Промийте гречку до прозорої води.",
      "Залийте крупу водою у співвідношенні 1:2 і варіть на малому вогні до м'якості.",
      "Додайте молоко й прогрійте кашу ще кілька хвилин.",
      "Наприкінці додайте масло, перемішайте та залиште під кришкою на 3 хвилини."
    ],
    ingredients: [
      { name: "Гречка", amount: 160, unit: "г", categories: ["Крупи", "Бакалія"], includeTerms: ["крупа гречана", "гречка"], excludeTerms: ["зелен", "пластівц"] },
      { name: "Молоко", amount: 300, unit: "мл", ...milk },
      { name: "Вершкове масло", amount: 20, unit: "г", ...butter }
    ]
  },
  {
    slug: "kurka-z-ovochamy",
    title: "Курка з овочевим гарніром",
    description: "Ситний обід: курка, солодкий перець і капуста.",
    durationMinutes: 35,
    servings: 2,
    difficulty: "Середньо",
    steps: [
      "Курку промийте, обсушіть і наріжте порційними шматками.",
      "Розігрійте пательню з олією.",
      "Обсмажте курку до золотистої скоринки, потім тушкуйте під кришкою до готовності.",
      "Овочі наріжте великими шматками й окремо обсмажте або протушкуйте 7-10 хвилин.",
      "Подавайте курку разом з овочевим гарніром."
    ],
    ingredients: [
      { name: "Куряче філе або стегно", amount: 500, unit: "г", categories: ["М'ясо"], includeTerms: ["філе куряче", "філе курки", "філе курчати", "стегно куряче", "стегно курчати"], excludeTerms: ["копчен", "варен", "су-від", "маринад", "гриль", "янтарн", "тушк"] },
      { name: "Солодкий перець", amount: 200, unit: "г", ...sweetPepper },
      { name: "Капуста", amount: 300, unit: "г", ...cabbage },
      { name: "Олія", amount: 30, unit: "мл", ...frying }
    ]
  },
  {
    slug: "omlet-iz-syrom",
    title: "Омлет із сиром",
    description: "Сніданок за десять хвилин із яєць, молока та твердого сиру.",
    durationMinutes: 10,
    servings: 2,
    difficulty: "Легко",
    steps: [
      "Збийте яйця з молоком і дрібкою солі.",
      "Натріть сир на тертці.",
      "Розтопіть масло на пательні й вилийте яєчну суміш.",
      "Смажте на середньому вогні, доки краї не схопляться.",
      "Посипте сиром, накрийте кришкою на 1-2 хвилини й подавайте."
    ],
    ingredients: [
      { name: "Яйця", amount: 4, unit: "шт", ...eggs },
      { name: "Молоко", amount: 60, unit: "мл", ...milk },
      { name: "Твердий сир", amount: 60, unit: "г", categories: DAIRY, includeTerms: ["сир твердий", "сир гауда", "сир чеддер", "сир едам", "сир маасдам"], excludeTerms: ["безлактоз", "копчен", "трюфел", "грана", "пармезан", "тертий"] },
      { name: "Вершкове масло", amount: 15, unit: "г", ...butter }
    ]
  },
  {
    slug: "ovochevyi-salat",
    title: "Овочевий салат із сиром",
    description: "Легкий салат зі свіжих овочів, бринзи та оливкової олії.",
    durationMinutes: 15,
    servings: 2,
    difficulty: "Легко",
    steps: [
      "Помийте овочі та обсушіть їх паперовим рушником.",
      "Наріжте огірок, перець і капусту зручними шматками.",
      "Додайте сир кубиками.",
      "Заправте оливковою олією, перемішайте й подавайте охолодженим."
    ],
    ingredients: [
      { name: "Огірок", amount: 250, unit: "г", categories: VEGETABLES, includeTerms: ["огірок"], excludeTerms: ["маринов", "солон", "консерв", "квашен"] },
      { name: "Солодкий перець", amount: 150, unit: "г", ...sweetPepper },
      { name: "Капуста", amount: 150, unit: "г", ...cabbage },
      { name: "Бринза або фета", amount: 100, unit: "г", categories: DAIRY, includeTerms: ["бринза", "сир бринза", "сир фета", "фета", "сир фелата"], excludeTerms: ["трав", "часник", "безлактоз", "копчен"] },
      { name: "Оливкова олія", amount: 30, unit: "мл", ...oliveOil }
    ]
  },
  {
    slug: "syrnyky",
    title: "Сирники",
    description: "Домашні сирники з кисломолочного сиру.",
    durationMinutes: 30,
    servings: 2,
    difficulty: "Середньо",
    steps: [
      "Розімніть сир виделкою, додайте яйце й цукор, перемішайте.",
      "Всипте борошно й замісіть м'яку масу. Залиште на 5 хвилин.",
      "Сформуйте невеликі сирники й обваляйте їх у борошні.",
      "Обсмажте на олії на середньому вогні по 3-4 хвилини з кожного боку.",
      "Подавайте теплими, за бажанням зі сметаною."
    ],
    ingredients: [
      { name: "Кисломолочний сир", amount: 400, unit: "г", categories: DAIRY, includeTerms: ["сир кисломолочний"], excludeTerms: ["сметан", "солон", "зернист", "ізюм", "родзин", "ваніл", "кураг", "шоколад", "десерт", "безлактоз"] },
      { name: "Яйця", amount: 1, unit: "шт", ...eggs },
      { name: "Пшеничне борошно", amount: 80, unit: "г", categories: ["Бакалія"], includeTerms: ["борошно"], excludeTerms: ["кукурудз", "рисов", "гречан", "житн", "цільнозерн", "вівсян", "мигдал", "кокос", "нут"] },
      { name: "Цукор", amount: 30, unit: "г", categories: ["Бакалія"], includeTerms: ["цукор"], excludeTerms: ["ваніл", "коричн", "пудр", "тростин", "пресован", "стік"] },
      { name: "Олія", amount: 30, unit: "мл", ...frying },
      { name: "Сметана", amount: 100, unit: "г", optional: true, categories: DAIRY, includeTerms: ["сметана"], excludeTerms: ["безлактоз", "соус"] }
    ]
  }
];
