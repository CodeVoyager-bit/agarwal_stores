import { cookies, headers } from "next/headers";
import { cache } from "react";
import { isLang, type Lang } from ".";
import { DICTS } from "./dict";

/** The language chosen with the switch (a cookie), or else the phone's own first language if it's ours. */
export const getLang = cache(async (): Promise<Lang> => {
  const chosen = (await cookies()).get("lang")?.value;
  if (isLang(chosen)) return chosen;
  const first = (await headers()).get("accept-language")?.split(",")[0]?.trim().slice(0, 2).toLowerCase();
  return isLang(first) ? first : "en";
});

export const getT = cache(async () => DICTS[await getLang()]);
