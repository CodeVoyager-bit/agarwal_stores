"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useTransition } from "react";
import { LANG_NAME, LANGS, translateMessage, type Lang } from "@/lib/i18n";
import type { ClientDict } from "@/lib/i18n/dict";

const I18n = createContext<{ lang: Lang; t: ClientDict } | null>(null);

/** Set once in the root layout with the reader's language and its words. */
export function I18nProvider({ lang, t, children }: { lang: Lang; t: ClientDict; children: React.ReactNode }) {
  return <I18n.Provider value={{ lang, t }}>{children}</I18n.Provider>;
}

export const useT = () => useContext(I18n)!.t;
export const useLang = () => useContext(I18n)!.lang;

/** Server messages (errors, "Saved.") in the reader's language: const tr = useMsg(); tr(state.error). */
export function useMsg() {
  const t = useT();
  return (message?: string) => translateMessage(message, t.messages);
}

/** English · हिन्दी · मराठी, remembered for a year; the page redraws in place, cart and all. */
export function LanguageSwitch() {
  const lang = useLang();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="lang-switch" title={t.common.header.language}>
      <Languages size={16} aria-hidden="true" />
      <span className="sr-only">{t.common.header.language} / Language</span>
      <select
        value={lang}
        disabled={pending}
        onChange={(e) => {
          document.cookie = `lang=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
          start(() => router.refresh());
        }}
      >
        {LANGS.map((l) => (
          <option key={l} value={l} lang={l}>
            {LANG_NAME[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
