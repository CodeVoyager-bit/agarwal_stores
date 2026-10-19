import type { ShopItem } from "./format";

/**
 * What goes with what on Diwali night, strongest first. A family buying sparklers lights chakri and
 * anar next, all three gentle enough for children; rockets and sky shots fill the same sky; a gift
 * box gets topped up with the family favourites. A shelf not listed here gets no suggestions.
 */
export const GOES_WITH: Record<string, string[]> = {
  Sparklers: ["Chakri", "Anar", "Kids Special"],
  Chakri: ["Anar", "Sparklers"],
  Anar: ["Chakri", "Sparklers"],
  "Kids Special": ["Sparklers", "Chakri", "Anar"],
  Rockets: ["Sky Shots", "Anar", "Bombs"],
  "Sky Shots": ["Rockets", "Anar", "Gift Boxes"],
  Bombs: ["Rockets", "Sky Shots"],
  "Gift Boxes": ["Sparklers", "Anar", "Sky Shots"],
};

/**
 * Up to `limit` products from the shelves that go with `categories`, taking turns between shelves so
 * one shelf doesn't fill the row. Shelves already chosen are left out (unless nothing else is left),
 * and so are products in `skip` and sold-out ones. On each shelf: best sellers first (`popular`, ids
 * by units sold), then the cheapest, the easy add-on.
 */
export function goesWith(items: ShopItem[], categories: string[], skip: Set<string>, popular: string[], limit = 4) {
  const have = new Set(categories);
  const paired = [...new Set(categories.flatMap((c) => GOES_WITH[c] ?? []))];
  const rank = (id: string) => (popular.includes(id) ? popular.indexOf(id) : popular.length);
  const shelf = new Map(
    paired.map((c) => [c, items.filter((i) => i.category === c && i.stock > 0 && i.price > 0 && !skip.has(i.id)).sort((a, b) => rank(a.id) - rank(b.id) || a.price - b.price)]),
  );
  // new shelves when any of them has something in stock; otherwise more from the chosen ones
  const fresh = paired.filter((c) => !have.has(c) && shelf.get(c)!.length);
  const queues = (fresh.length ? fresh : paired).map((c) => shelf.get(c)!);
  const picks: ShopItem[] = [];
  while (picks.length < limit && queues.some((q) => q.length))
    for (const q of queues) if (q.length && picks.length < limit) picks.push(q.shift()!);
  return picks;
}
