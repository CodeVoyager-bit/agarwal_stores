import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { saveShopAction } from "@/lib/actions";
import { requireStaff } from "@/lib/auth";
import { fill } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n/dict";
import { rich } from "@/lib/i18n/rich";
import { getT } from "@/lib/i18n/server";
import { SETTING_GROUPS, SETTINGS, shopDetails, type Settings } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const tabs = (await getT()).common.adminTabs;
  return { title: `${tabs.shop} · ${tabs.label}` };
}

type Words = Dict["catalog"]["shop"];

/** One setting's input, by its kind in lib/legal.ts SETTINGS, with its label and hint. */
function Setting({ field, value, w, shop }: { field: (typeof SETTINGS)[number]; value: Settings[keyof Settings]; w: Words; shop: string }) {
  const { key, kind, max, min, options } = field;
  const { label, hint } = w.fields[key];
  const help = <small>{fill(hint, { shop })}</small>;
  if (kind === "check")
    return (
      <div className="setting">
        <label className="f-check">
          <input type="checkbox" name={key} defaultChecked={Boolean(value)} /> {label}
        </label>
        {help}
      </div>
    );
  return (
    <label className="setting">
      <span>{label}</span>
      {kind === "select" ? (
        <select name={key} defaultValue={String(value)}>
          {options!.map((option) => (
            <option key={option} value={option}>
              {(w.options as Record<string, string>)[option] ?? option}
            </option>
          ))}
        </select>
      ) : kind === "long" ? (
        <textarea name={key} rows={key === "pincodes" ? 3 : 2} maxLength={max} defaultValue={String(value)} required={key === "address"} />
      ) : kind === "number" ? (
        <input name={key} type="number" inputMode="numeric" min={min} max={max} step={1} required defaultValue={String(value)} />
      ) : (
        <input
          name={key}
          maxLength={max}
          defaultValue={String(value)}
          required={key === "legalName"}
          type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
          autoComplete="off"
          className={key === "gstin" || key === "billPrefix" ? "upper" : undefined}
        />
      )}
      {help}
    </label>
  );
}

/** Everything an owner can change, in four groups, saved together. Owners only. */
export default async function SettingsPage() {
  await requireStaff("shop", "/admin/shop");
  const [s, t] = await Promise.all([shopDetails(), getT()]);
  const w = t.catalog.shop;
  return (
    <>
      <h1>{t.common.adminTabs.shop}</h1>
      <p className="muted">
        {rich(w.intro, { terms: (x) => <Link href="/terms">{x}</Link>, privacy: (x) => <Link href="/privacy">{x}</Link> })}
      </p>
      <nav className="settings-jump" aria-label={t.common.adminTabs.shop}>
        {SETTING_GROUPS.map((group) => (
          <a key={group} href={`#set-${group}`}>
            {w.groups[group]}
          </a>
        ))}
      </nav>
      <ActionForm action={saveShopAction} submit={w.save} primary className="settings">
        {SETTING_GROUPS.map((group) => (
          <fieldset key={group} id={`set-${group}`} className="panel settings-group">
            <legend>{w.groups[group]}</legend>
            {SETTINGS.filter((field) => field.group === group).map((field) => (
              <Setting key={field.key} field={field} value={s[field.key]} w={w} shop={s.legalName} />
            ))}
          </fieldset>
        ))}
      </ActionForm>
    </>
  );
}
