import { BadgeCheck, LogOut, MapPin, Package, Smartphone, UserRound, Mail, KeyRound, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import mongoose from "mongoose";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { GoogleMark } from "@/components/google-button";
import { AddPhone, EmailChange, PasswordInput, PhoneField } from "@/components/login-form";
import { addAddressAction, defaultAddressAction, deleteAccountAction, editAddressAction, unlinkGoogleAction, linkGoogleAction, logoutAction, logoutEverywhereAction, passwordAction, removeAddressAction, saveNameAction } from "@/lib/actions";
import { mockOtp, requireUser } from "@/lib/auth";
import { googleEnabled } from "@/lib/better-auth";
import { ADDRESS_LABELS, connectDB, MAX_ADDRESSES, Order, User } from "@/lib/db";
import { day } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { rich } from "@/lib/i18n/rich";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getT()).auth.account.title} · Agarwal Stores` };
}

async function AddressFields({ address, phone }: { address?: { label: string; line: string; landmark: string; pincode: string; phone: string }; phone: string }) {
  const t = await getT();
  const a = t.auth.account;
  return (
    <>
      <label>
        {a.saveAs}
        {/* stored in English, shown in the reader's language */}
        <select name="label" defaultValue={address?.label ?? "Home"}>
          {ADDRESS_LABELS.map((l) => (
            <option key={l} value={l}>
              {a.labels[l] ?? l}
            </option>
          ))}
        </select>
      </label>
      <label>
        {a.fullAddress}
        <textarea name="line" rows={3} required minLength={10} maxLength={300} autoComplete="street-address" placeholder={a.addressPlaceholder} defaultValue={address?.line} />
      </label>
      <div className="two">
        <label>
          <span>
            {a.landmark} <small>{t.common.words.optional}</small>
          </span>
          <input name="landmark" maxLength={120} autoComplete="off" placeholder={a.landmarkPlaceholder} defaultValue={address?.landmark} />
        </label>
        <label>
          {a.pincode}
          <input name="pincode" required inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="postal-code" placeholder="226001" defaultValue={address?.pincode} />
        </label>
      </div>
      {/* anyone's number at this address; the same one can be on several addresses */}
      <PhoneField label={a.deliveryMobile} initial={address?.phone || phone} />
    </>
  );
}

/** Everything about the logged-in person in one place, each part changeable where it sits. */
export default async function Account({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const user = await requireUser("/account");
  const { google } = await searchParams;
  await connectDB();
  const uid = new mongoose.Types.ObjectId(user.id);
  const [record, logins, orders] = await Promise.all([
    User.findById(uid).lean(),
    mongoose.connection.collection("authAccounts").find({ userId: uid }).project({ providerId: 1 }).toArray(),
    Order.countDocuments({ user: uid }),
  ]);
  const hasPassword = logins.some((l) => l.providerId === "credential");
  const hasGoogle = logins.some((l) => l.providerId === "google");
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const a = t.auth.account;
  const hint = mockOtp() ? fill(t.auth.login.testCode, { code: process.env.MOCK_OTP_CODE || "123456" }) : undefined;
  const verified = (
    <span className="tag create">
      <BadgeCheck size={14} aria-hidden="true" /> {a.verified}
    </span>
  );

  return (
    <>
      <div className="head">
        <h1>{a.title}</h1>
        {user.role !== "customer" && <span className="pill delivered">{a.roles[user.role]}</span>}
      </div>
      {google === "linked" && <p className="success">{a.googleLinked}</p>}
      {google === "failed" && <p className="error">{a.googleFailed}</p>}
      {google === "password" && <p className="error">{a.googlePassword}</p>}

      <div className="account-grid">
        <section className="panel stack" aria-labelledby="profile">
          <h2 id="profile">
            <UserRound size={20} aria-hidden="true" /> {a.profile}
          </h2>
          <dl className="rows">
            <div>
              <dt>{a.name}</dt>
              <dd>{user.name || a.notSet}</dd>
            </div>
            <div>
              <dt>{a.since}</dt>
              <dd>{record?.createdAt ? day(record.createdAt, lang) : "—"}</dd>
            </div>
            <div>
              <dt>{a.orders}</dt>
              <dd>
                <Link href="/orders">
                  <Package size={14} aria-hidden="true" /> {fill(orders === 1 ? a.orderOne : a.orderMany, { n: orders })} →
                </Link>
              </dd>
            </div>
          </dl>
          <details className="edit" open={!user.name}>
            <summary>{user.name ? a.changeName : a.addName}</summary>
            <ActionForm action={saveNameAction} submit={a.saveName}>
              <label>
                {t.auth.login.yourName}
                <input name="name" autoComplete="name" required minLength={2} maxLength={80} defaultValue={user.name} />
              </label>
            </ActionForm>
          </details>
        </section>

        <section className="panel stack" aria-labelledby="mobile">
          <h2 id="mobile">
            <Smartphone size={20} aria-hidden="true" /> {a.mobile}
          </h2>
          {user.phone ? (
            <p className="who">
              <span>+91 {user.phone}</span> {record?.phoneVerified !== false && verified}
            </p>
          ) : (
            <p className="muted">{a.noNumber}</p>
          )}
          {user.phone ? (
            <details className="edit">
              <summary>{a.changeNumber}</summary>
              <AddPhone hint={hint} title={t.auth.phone.changeNumber} withPassword={hasPassword} />
            </details>
          ) : (
            <AddPhone hint={hint} withPassword={hasPassword} />
          )}
        </section>

        <section className="panel stack" aria-labelledby="email">
          <h2 id="email">
            <Mail size={20} aria-hidden="true" /> {t.auth.fields.email}
          </h2>
          {user.email ? (
            <p className="who">
              <span>{user.email}</span> {user.emailVerified && verified}
            </p>
          ) : (
            <p className="muted">{a.noEmail}</p>
          )}
          <details className="edit" open={!user.email}>
            <summary>{user.email ? a.changeEmail : a.addEmail}</summary>
            <EmailChange current={user.email} hint={hint} withPassword={hasPassword} />
          </details>
        </section>

        <section className="panel stack" aria-labelledby="login">
          <h2 id="login">
            <KeyRound size={20} aria-hidden="true" /> {a.login}
          </h2>
          <dl className="rows">
            <div>
              <dt>{t.auth.login.password}</dt>
              <dd>{hasPassword ? a.set : a.notSetYet}</dd>
            </div>
            {googleEnabled() && (
              <div>
                <dt>Google</dt>
                <dd>{hasGoogle ? a.connected : a.notConnected}</dd>
              </div>
            )}
          </dl>
          <details className="edit" open={!hasPassword}>
            <summary>{hasPassword ? a.changePassword : a.setPassword}</summary>
          <ActionForm action={passwordAction} submit={hasPassword ? a.changePasswordButton : a.setPasswordButton}>
            {hasPassword && (
              <PasswordInput name="current" autoComplete="current-password" label={a.current} />
            )}
            <PasswordInput name="password" autoComplete="new-password" label={a.newPassword} />
            <PasswordInput name="confirm" autoComplete="new-password" label={t.auth.login.again} />
          </ActionForm>
          </details>
          {googleEnabled() && !hasGoogle && (
            <form action={linkGoogleAction} className="fields-plain">
              {hasPassword && <PasswordInput name="current" autoComplete="current-password" label={a.passwordForGoogle} />}
              <button className="btn google">
                <GoogleMark /> {a.connectGoogle}
              </button>
            </form>
          )}
          {hasGoogle && (
            <details className="edit">
              <summary>{a.disconnectGoogle}</summary>
              {hasPassword ? (
                <ActionForm action={unlinkGoogleAction} submit={a.disconnectGoogle}>
                  <PasswordInput name="current" autoComplete="current-password" label={a.yourPassword} />
                </ActionForm>
              ) : (
                <p className="note">{a.passwordFirst}</p>
              )}
            </details>
          )}
        </section>

        <section className="panel stack" aria-labelledby="address">
          <h2 id="address">
            <MapPin size={20} aria-hidden="true" /> {a.addresses}
          </h2>
          {user.addresses.length ? (
            <ul className="address-book">
              {user.addresses.map((ad, n) => (
                <li key={ad.id}>
                  <p className="address-head">
                    <strong>{a.labels[ad.label] ?? ad.label}</strong>
                    {n === 0 && <span className="tag create">{a.default}</span>}
                  </p>
                  <p>
                    {ad.line}
                    {ad.landmark && <small>{fill(a.near, { place: ad.landmark })}</small>}
                    <small>
                      <strong>{ad.pincode}</strong>
                    </small>
                    {ad.phone && <small>{fill(a.call, { phone: ad.phone })}</small>}
                  </p>
                  <div className="address-actions">
                    <details className="edit">
                      <summary>{t.common.words.edit}</summary>
                      <ActionForm action={editAddressAction} submit={a.saveAddress}>
                        <input type="hidden" name="id" value={ad.id} />
                        <AddressFields address={ad} phone={user.phone} />
                      </ActionForm>
                    </details>
                    {n > 0 && (
                      <ActionForm action={defaultAddressAction} submit={a.makeDefault} className="inline-form">
                        <input type="hidden" name="id" value={ad.id} />
                      </ActionForm>
                    )}
                    <ActionForm action={removeAddressAction} submit={t.common.words.remove} className="inline-form" confirm={fill(a.removeConfirm, { label: a.labels[ad.label] ?? ad.label })}>
                      <input type="hidden" name="id" value={ad.id} />
                    </ActionForm>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{a.noAddresses}</p>
          )}
          {user.addresses.length < MAX_ADDRESSES && (
            <details className="edit" open={!user.addresses.length}>
              <summary>{a.addAddress}</summary>
              <ActionForm action={addAddressAction} submit={a.saveAddress}>
                <AddressFields phone={user.phone} />
              </ActionForm>
            </details>
          )}
        </section>

        <section className="panel stack" aria-labelledby="out">
          <h2 id="out">
            <LogOut size={20} aria-hidden="true" /> {t.common.header.logOut}
          </h2>
          <form action={logoutAction}>
            <button className="btn">{t.common.header.logOut}</button>
          </form>
          <form action={logoutEverywhereAction}>
            <button className="btn quiet">{a.logOutAll}</button>
          </form>
        </section>

        {/* the right to erasure (DPDP Act); staff are removed by an owner instead */}
        {user.role === "customer" && (
          <section className="panel stack" aria-labelledby="delete">
            <h2 id="delete">
              <Trash2 size={20} aria-hidden="true" /> {a.delete}
            </h2>
            <p className="muted">{rich(a.deleteNote, { privacy: (s) => <Link href="/privacy#rights">{s}</Link> })}</p>
            <ActionForm action={deleteAccountAction} submit={a.deleteButton}>
              <label>
                {a.typeDelete}
                <input name="confirm" required autoComplete="off" autoCapitalize="characters" />
              </label>
              {hasPassword && <PasswordInput name="current" autoComplete="current-password" label={a.passwordToConfirm} />}
            </ActionForm>
          </section>
        )}
      </div>
    </>
  );
}
