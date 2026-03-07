const emojiMap: Record<string, string> = {
  apple: "\u{1F34E}",
  banana: "\u{1F34C}",
  avocado: "\u{1F951}",
  orange: "\u{1F34A}",
  lemon: "\u{1F34B}",
  lime: "\u{1F34B}",
  strawberry: "\u{1F353}",
  berries: "\u{1FAD0}",
  blueberry: "\u{1FAD0}",
  grape: "\u{1F347}",
  grapejuice: "\u{1F377}",
  watermelon: "\u{1F349}",
  pineapple: "\u{1F34D}",
  pear: "\u{1F350}",
  peach: "\u{1F351}",
  mango: "\u{1F96D}",
  kiwi: "\u{1F95D}",
  cherry: "\u{1F352}",
  tomato: "\u{1F345}",
  carrot: "\u{1F955}",
  broccoli: "\u{1F966}",
  lettuce: "\u{1F96C}",
  salad: "\u{1F957}",
  potato: "\u{1F954}",
  rice: "\u{1F35A}",
  bread: "\u{1F35E}",
  pizza: "\u{1F355}",
  egg: "\u{1F95A}",
  chicken: "\u{1F357}",
  beef: "\u{1F969}",
  fish: "\u{1F41F}",
  salmon: "\u{1F41F}",
  sushi: "\u{1F363}",
  coffee: "\u{2615}",
  tea: "\u{1F375}",
  milk: "\u{1F95B}",
  yogurt: "\u{1FAD7}",
  cheese: "\u{1F9C0}",
  donut: "\u{1F369}",
  cookie: "\u{1F36A}",
  chocolate: "\u{1F36B}",
  honey: "\u{1F36F}",
  nuts: "\u{1F95C}"
};

export function getFoodEmoji(name: string) {
  const key = name.toLowerCase().replace(/\s+/g, "");
  for (const [needle, emoji] of Object.entries(emojiMap)) {
    if (key.includes(needle)) return emoji;
  }
  return "\u{1F957}";
}
