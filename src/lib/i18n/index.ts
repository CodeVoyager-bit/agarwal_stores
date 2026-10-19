/**
 * English, Hindi and Marathi. The words live in ./sections, one file per part of the site, the three
 * languages side by side (TypeScript checks hi and mr have every key en has). Server pages read them
 * with getT() (./server.ts), client components with useT() (components/i18n.tsx). Words people use
 * across the site are in sections/common.ts; keep the same word for the same thing everywhere.
 */
export const LANGS = ["en", "hi", "mr"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_NAME: Record<Lang, string> = { en: "English", hi: "हिन्दी", mr: "मराठी" };
export const isLang = (value: unknown): value is Lang => LANGS.includes(value as Lang);

/** "Only {n} left" with { n: 3 } → "Only 3 left". A name with no value is left as it is. */
export const fill = (text: string, vars: Record<string, string | number> = {}) =>
  text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));

/** Dates in the reader's language, with the 0–9 digits people type (Marathi would default to Devanagari ones). */
export const locale = (lang: Lang) => ({ en: "en-IN", hi: "hi-IN", mr: "mr-IN-u-nu-latn" })[lang];

const compiled = new WeakMap<object, { pattern: RegExp; names: string[]; to: string }[]>();

/**
 * A message the server wrote in English ("Only 3 left of Anar…"), in the reader's language. `table`
 * maps each English wording to its translation; {placeholders} match any value and carry it across.
 * A wording not in the table stays English: a new message is never lost, only untranslated.
 */
export function translateMessage(message: string | undefined, table: Record<string, string>) {
  if (!message) return "";
  if (table[message]) return table[message];
  let list = compiled.get(table);
  if (!list) {
    list = Object.entries(table)
      .filter(([from]) => from.includes("{"))
      .map(([from, to]) => {
        const names: string[] = [];
        const source = from
          .split(/\{(\w+)\}/)
          .map((part, i) => (i % 2 ? (names.push(part), "(.+?)") : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
          .join("");
        return { pattern: new RegExp(`^${source}$`, "s"), names, to };
      });
    compiled.set(table, list);
  }
  for (const { pattern, names, to } of list) {
    const found = pattern.exec(message);
    if (found) return fill(to, Object.fromEntries(names.map((name, i) => [name, found[i + 1]])));
  }
  return message;
}

/** A shelf's name in the reader's language; one the shop added itself stays as it was typed. */
export const catName = (t: { common: { categories: Record<string, string> } }, category: string) =>
  Object.hasOwn(t.common.categories, category) ? t.common.categories[category] : category;
