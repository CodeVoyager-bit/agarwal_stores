import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { saveShopAction } from "@/lib/actions";
import { requireStaff } from "@/lib/auth";
import { fill } from "@/lib/i18n";
import { rich } from "@/lib/i18n/rich";
import { getT } from "@/lib/i18n/server";
import { SHOP_FIELDS, shopDetails } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const tabs = (await getT()).common.adminTabs;
  return { title: `${tabs.shop} · ${tabs.label}` };
}

/** The shop's legal details, quoted on the Terms, Privacy and product pages. Owners only. */
export default async function ShopDetailsPage() {
  await requireStaff("shop", "/admin/shop");
  const [shop, t] = await Promise.all([shopDetails(), getT()]);
  const w = t.catalog.shop;
  // a field legal.ts gains later shows its own English until it's added to the catalog section
  const words: Partial<Record<string, { label: string; hint: string }>> = w.fields;
  const options: Partial<Record<string, string>> = w.options;
  return (
    <>
      <h1>{t.common.adminTabs.shop}</h1>
      <p className="muted">
        {rich(w.intro, { terms: (s) => <Link href="/terms">{s}</Link>, privacy: (s) => <Link href="/privacy">{s}</Link> })}
      </p>
      <section className="panel shop-details">
        <ActionForm action={saveShopAction} submit={w.save} primary>
          {SHOP_FIELDS.map((field) => {
            const { key, label, hint, max } = field;
            return (
              <label key={key}>
                <span>
                  {words[key]?.label ?? label} <small>{words[key]?.hint ?? hint}</small>
                </span>
                {"options" in field ? (
                  <select name={key} defaultValue={shop[key]}>
                    {field.options.map(([value, text]) => (
                      <option key={value} value={value}>
                        {options[value] ?? text}
                      </option>
                    ))}
                  </select>
                ) : key === "address" ? (
                  <textarea name={key} rows={2} maxLength={max} defaultValue={shop[key]} required />
                ) : (
                  <input
                    name={key}
                    maxLength={max}
                    defaultValue={shop[key]}
                    required={key === "legalName"}
                    type={key === "email" ? "email" : "text"}
                    autoComplete="off"
                    className={key === "gstin" ? "upper" : undefined}
                  />
                )}
              </label>
            );
          })}
          <p className="note">
            {fill(w.phone, { phone: process.env.SHOP_PHONE ? `+91 ${process.env.SHOP_PHONE}` : w.notSet })}
          </p>
        </ActionForm>
      </section>
    </>
  );
}
