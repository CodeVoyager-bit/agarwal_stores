import { BadgeCheck, LogOut, MapPin, Package, Smartphone, UserRound, Mail, KeyRound } from "lucide-react";
import type { Metadata } from "next";
import mongoose from "mongoose";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { GoogleMark } from "@/components/google-button";
import { AddPhone, EmailChange } from "@/components/login-form";
import { linkGoogleAction, logoutAction, logoutEverywhereAction, passwordAction, saveAddressAction, saveNameAction } from "@/lib/actions";
import { mockOtp, requireUser } from "@/lib/auth";
import { googleEnabled } from "@/lib/better-auth";
import { connectDB, Order, User } from "@/lib/db";
import { day } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/roles";

export const metadata: Metadata = { title: "Your Account · Agarwal Stores" };

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
              <label>
                Current password
                <input name="current" type="password" autoComplete="current-password" required maxLength={128} />
              </label>
            )}
            <label>
              New password (8+ characters)
              <input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
            </label>
            <label>
              Type it again
              <input name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
            </label>
          </ActionForm>
          </details>
          {googleEnabled() && !hasGoogle && (
            <form action={linkGoogleAction}>
              <button className="btn google">
                <GoogleMark /> Connect Google
              </button>
            </form>
          )}
        </section>

        <section className="panel stack" aria-labelledby="address">
          <h2 id="address">
            <MapPin size={20} aria-hidden="true" /> Delivery Address
          </h2>
          {user.address ? (
            <p>
              {user.address.line}
              {user.address.landmark && <small>Near {user.address.landmark}</small>}
              <small>
                <strong>{user.address.pincode}</strong>
              </small>
            </p>
          ) : (
            <p className="muted">No address yet. Checkout fills it in for you once it’s saved.</p>
          )}
          <details className="edit" open={!user.address}>
            <summary>{user.address ? "Change address" : "Add an address"}</summary>
          <ActionForm action={saveAddressAction} submit="Save Address">
            <label>
              Full address
              <textarea name="line" rows={3} required minLength={10} maxLength={300} autoComplete="street-address" placeholder="House no., street, area…" defaultValue={user.address?.line} />
            </label>
            <div className="two">
              <label>
                <span>
                  Landmark <small>(optional)</small>
                </span>
                <input name="landmark" maxLength={120} autoComplete="off" placeholder="Near temple, school…" defaultValue={user.address?.landmark} />
              </label>
              <label>
                Pincode
                <input name="pincode" required inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="postal-code" placeholder="226001" defaultValue={user.address?.pincode} />
              </label>
            </div>
          </ActionForm>
          </details>
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
      </div>
    </>
  );
}
