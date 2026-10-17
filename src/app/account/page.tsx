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
import { ROLE_LABEL } from "@/lib/roles";

export const metadata: Metadata = { title: "Your Account · Agarwal Stores" };

function AddressFields({ address, phone }: { address?: { label: string; line: string; landmark: string; pincode: string; phone: string }; phone: string }) {
  return (
    <>
      <label>
        Save as
        <select name="label" defaultValue={address?.label ?? "Home"}>
          {ADDRESS_LABELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </label>
      <label>
        Full address
        <textarea name="line" rows={3} required minLength={10} maxLength={300} autoComplete="street-address" placeholder="House no., street, area…" defaultValue={address?.line} />
      </label>
      <div className="two">
        <label>
          <span>
            Landmark <small>(optional)</small>
          </span>
          <input name="landmark" maxLength={120} autoComplete="off" placeholder="Near temple, school…" defaultValue={address?.landmark} />
        </label>
        <label>
          Pincode
          <input name="pincode" required inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="postal-code" placeholder="226001" defaultValue={address?.pincode} />
        </label>
      </div>
      {/* anyone's number at this address; the same one can be on several addresses */}
      <PhoneField label="Mobile number for delivery" initial={address?.phone || phone} />
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
  const hint = mockOtp() ? `Test mode: the code is ${process.env.MOCK_OTP_CODE || "123456"}` : undefined;
  const verified = (
    <span className="tag create">
      <BadgeCheck size={14} aria-hidden="true" /> Verified
    </span>
  );

  return (
    <>
      <div className="head">
        <h1>Your Account</h1>
        {user.role !== "customer" && <span className="pill delivered">{ROLE_LABEL[user.role]}</span>}
      </div>
      {google === "linked" && <p className="success">Google is connected. You can use it to log in next time.</p>}
      {google === "failed" && <p className="error">Google wasn’t connected. Please try again.</p>}
      {google === "password" && <p className="error">Google wasn’t connected: your password wasn’t right.</p>}

      <div className="account-grid">
        <section className="panel stack" aria-labelledby="profile">
          <h2 id="profile">
            <UserRound size={20} aria-hidden="true" /> Profile
          </h2>
          <dl className="rows">
            <div>
              <dt>Name</dt>
              <dd>{user.name || "Not set"}</dd>
            </div>
            <div>
              <dt>Customer since</dt>
              <dd>{record?.createdAt ? day(record.createdAt) : "—"}</dd>
            </div>
            <div>
              <dt>Orders</dt>
              <dd>
                <Link href="/orders">
                  <Package size={14} aria-hidden="true" /> {orders} {orders === 1 ? "order" : "orders"} →
                </Link>
              </dd>
            </div>
          </dl>
          <details className="edit" open={!user.name}>
            <summary>{user.name ? "Change name" : "Add your name"}</summary>
            <ActionForm action={saveNameAction} submit="Save Name">
              <label>
                Your name
                <input name="name" autoComplete="name" required minLength={2} maxLength={80} defaultValue={user.name} />
              </label>
            </ActionForm>
          </details>
        </section>

        <section className="panel stack" aria-labelledby="mobile">
          <h2 id="mobile">
            <Smartphone size={20} aria-hidden="true" /> Mobile Number
          </h2>
          {user.phone ? (
            <p className="who">
              <span>+91 {user.phone}</span> {record?.phoneVerified !== false && verified}
            </p>
          ) : (
            <p className="muted">No number yet. We need one to call you about delivery.</p>
          )}
          {user.phone ? (
            <details className="edit">
              <summary>Change number</summary>
              <AddPhone hint={hint} title="Change Number" />
            </details>
          ) : (
            <AddPhone hint={hint} />
          )}
        </section>

        <section className="panel stack" aria-labelledby="email">
          <h2 id="email">
            <Mail size={20} aria-hidden="true" /> Email
          </h2>
          {user.email ? (
            <p className="who">
              <span>{user.email}</span> {user.emailVerified && verified}
            </p>
          ) : (
            <p className="muted">No email yet.</p>
          )}
          <details className="edit" open={!user.email}>
            <summary>{user.email ? "Change email" : "Add an email to log in with"}</summary>
            <EmailChange current={user.email} hint={hint} />
          </details>
        </section>

        <section className="panel stack" aria-labelledby="login">
          <h2 id="login">
            <KeyRound size={20} aria-hidden="true" /> Logging In
          </h2>
          <dl className="rows">
            <div>
              <dt>Password</dt>
              <dd>{hasPassword ? "Set" : "Not set yet"}</dd>
            </div>
            {googleEnabled() && (
              <div>
                <dt>Google</dt>
                <dd>{hasGoogle ? "Connected" : "Not connected"}</dd>
              </div>
            )}
          </dl>
          <details className="edit" open={!hasPassword}>
            <summary>{hasPassword ? "Change password" : "Set a password"}</summary>
          <ActionForm action={passwordAction} submit={hasPassword ? "Change Password" : "Set Password"}>
            {hasPassword && (
              <PasswordInput name="current" autoComplete="current-password" label="Current password" />
            )}
            <PasswordInput name="password" autoComplete="new-password" label="New password (8+ characters)" />
            <PasswordInput name="confirm" autoComplete="new-password" label="Type it again" />
          </ActionForm>
          </details>
          {googleEnabled() && !hasGoogle && (
            <form action={linkGoogleAction} className="fields-plain">
              {hasPassword && <PasswordInput name="current" autoComplete="current-password" label="Your password, to connect Google" />}
              <button className="btn google">
                <GoogleMark /> Connect Google
              </button>
            </form>
          )}
          {hasGoogle && (
            <details className="edit">
              <summary>Disconnect Google</summary>
              {hasPassword ? (
                <ActionForm action={unlinkGoogleAction} submit="Disconnect Google">
                  <PasswordInput name="current" autoComplete="current-password" label="Your password" />
                </ActionForm>
              ) : (
                <p className="note">Set a password first, so you can still log in without Google.</p>
              )}
            </details>
          )}
        </section>

        <section className="panel stack" aria-labelledby="address">
          <h2 id="address">
            <MapPin size={20} aria-hidden="true" /> Delivery Addresses
          </h2>
          {user.addresses.length ? (
            <ul className="address-book">
              {user.addresses.map((a, n) => (
                <li key={a.id}>
                  <p className="address-head">
                    <strong>{a.label}</strong>
                    {n === 0 && <span className="tag create">Default</span>}
                  </p>
                  <p>
                    {a.line}
                    {a.landmark && <small>Near {a.landmark}</small>}
                    <small>
                      <strong>{a.pincode}</strong>
                    </small>
                    {a.phone && <small>Call +91 {a.phone}</small>}
                  </p>
                  <div className="address-actions">
                    <details className="edit">
                      <summary>Edit</summary>
                      <ActionForm action={editAddressAction} submit="Save Address">
                        <input type="hidden" name="id" value={a.id} />
                        <AddressFields address={a} phone={user.phone} />
                      </ActionForm>
                    </details>
                    {n > 0 && (
                      <ActionForm action={defaultAddressAction} submit="Make Default" className="inline-form">
                        <input type="hidden" name="id" value={a.id} />
                      </ActionForm>
                    )}
                    <ActionForm action={removeAddressAction} submit="Remove" className="inline-form" confirm={`Remove the ${a.label} address?`}>
                      <input type="hidden" name="id" value={a.id} />
                    </ActionForm>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No addresses yet. One you type at checkout is saved here too.</p>
          )}
          {user.addresses.length < MAX_ADDRESSES && (
            <details className="edit" open={!user.addresses.length}>
              <summary>Add an address</summary>
              <ActionForm action={addAddressAction} submit="Save Address">
                <AddressFields phone={user.phone} />
              </ActionForm>
            </details>
          )}
        </section>

        <section className="panel stack" aria-labelledby="out">
          <h2 id="out">
            <LogOut size={20} aria-hidden="true" /> Log Out
          </h2>
          <form action={logoutAction}>
            <button className="btn">Log Out</button>
          </form>
          <form action={logoutEverywhereAction}>
            <button className="btn quiet">Log out on all phones and computers</button>
          </form>
        </section>

        {/* the right to erasure (DPDP Act); staff are removed by an owner instead */}
        {user.role === "customer" && (
          <section className="panel stack" aria-labelledby="delete">
            <h2 id="delete">
              <Trash2 size={20} aria-hidden="true" /> Delete Account
            </h2>
            <p className="muted">
              Deletes your login, addresses and Google link for good, once no booking is on its way. Past bookings stay in the shop’s GST records,
              without your name, number and street address (a bill of ₹50,000 or more before GST keeps the name and address). This can’t be undone. See our <Link href="/privacy#rights">Privacy Policy</Link>.
            </p>
            <ActionForm action={deleteAccountAction} submit="Delete My Account">
              <label>
                Type DELETE to confirm
                <input name="confirm" required autoComplete="off" autoCapitalize="characters" />
              </label>
            </ActionForm>
          </section>
        )}
      </div>
    </>
  );
}
