import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { saveShopAction } from "@/lib/actions";
import { requireStaff } from "@/lib/auth";
import { SHOP_FIELDS, shopDetails } from "@/lib/legal";

export const metadata: Metadata = { title: "Shop Details · Admin" };

/** The shop's legal details, quoted on the Terms, Privacy and product pages. Owners only. */
export default async function ShopDetailsPage() {
  await requireStaff("shop", "/admin/shop");
  const shop = await shopDetails();
  return (
    <>
      <h1>Shop Details</h1>
      <p className="muted">
        Shown to customers on the <Link href="/terms">Terms of Sale</Link>, <Link href="/privacy">Privacy Policy</Link> and every product page.
        A blank field is left off. The law asks for all of them, so fill them in before customers book.
      </p>
      <section className="panel shop-details">
        <ActionForm action={saveShopAction} submit="Save Details" primary>
          {SHOP_FIELDS.map((field) => {
            const { key, label, hint, max } = field;
            return (
              <label key={key}>
                <span>
                  {label} <small>{hint}</small>
                </span>
                {"options" in field ? (
                  <select name={key} defaultValue={shop[key]}>
                    {field.options.map(([value, text]) => (
                      <option key={value} value={value}>
                        {text}
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
            Phone: {process.env.SHOP_PHONE ? `+91 ${process.env.SHOP_PHONE}` : "not set"}. It comes from SHOP_PHONE on the server.
          </p>
        </ActionForm>
      </section>
    </>
  );
}
