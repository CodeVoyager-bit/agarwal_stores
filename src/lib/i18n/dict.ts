import type { Lang } from ".";
import * as app from "./sections/app";
import * as auth from "./sections/auth";
import * as catalog from "./sections/catalog";
import * as catalogUi from "./sections/catalogUi";
import * as common from "./sections/common";
import * as delivery from "./sections/delivery";
import * as legal from "./sections/legal";
import * as messages from "./sections/messages";
import * as orders from "./sections/orders";
import * as shop from "./sections/shop";
import * as staff from "./sections/staff";
import * as staffUi from "./sections/staffUi";

const sections = { common, app, shop, auth, orders, delivery, staff, staffUi, catalog, catalogUi, legal, messages };
type Sections = typeof sections;
export type Dict = { [K in keyof Sections]: Sections[K]["en"] };

export const DICTS = Object.fromEntries(
  (["en", "hi", "mr"] as const).map((lang) => [lang, Object.fromEntries(Object.entries(sections).map(([name, s]) => [name, s[lang]]))]),
) as Record<Lang, Dict>;

/** What client components get: everything but the pages only the server draws (admin pages, legal text). */
export type ClientDict = Omit<Dict, "staff" | "catalog" | "legal">;
export function clientDict(t: Dict): ClientDict {
  const { staff: _staff, catalog: _catalog, legal: _legal, ...rest } = t;
  return rest;
}
