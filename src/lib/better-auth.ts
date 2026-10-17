import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, phoneNumber } from "better-auth/plugins";
import mongoose from "mongoose";
import { connectDB } from "./db";
import { codeMail, placeholderEmail, sendEmail } from "./email";
import { mockOtp, sendCode } from "./sms";

/**
 * Logins, sessions, Google sign-in and the email/SMS codes run on better-auth, set up the way Agarwal
 * Online sets it up: users share the app's own "users" collection; passwords, sessions and codes
 * live in auth* collections beside it.
 */

/** The site's own address, for links in emails and Google's return trip. */
export function appOrigin() {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://127.0.0.1:3000";
}

export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// development codes are MOCK_OTP_CODE; these remember which numbers asked, so a code still expires
const mockChallenges = new Map<string, { expiresAt: number; attempts: number }>();

function build() {
  const client = mongoose.connection.getClient();
  const db = mongoose.connection.db!;
  const origin = appOrigin();
  const dev = process.env.NODE_ENV !== "production";

  return betterAuth({
    appName: "Agarwal Stores Crackers",
    baseURL: origin,
    secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
    // the site itself, this Vercel deployment, and any local port in development
    trustedOrigins: (request) => {
      const from = request?.headers.get("origin");
      return [
        origin,
        ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
        ...(dev && from && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(from) ? [from] : []),
      ];
    },
    // ponytail: no transactions, so plain local Mongo works too; Atlas would allow them if needed
    database: mongodbAdapter(db, { client, transaction: false }),
    emailAndPassword: {
      enabled: true,
      // accounts are made with a verified mobile number (or Google); email is a second way to log in
      disableSignUp: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    ...(googleEnabled() && {
      socialProviders: {
        google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET!, prompt: "select_account" as const },
      },
    }),
    user: {
      modelName: "users",
      // set only from the Staff page, never by the person signing up
      additionalFields: { role: { type: "string", required: false, defaultValue: "customer", input: false } },
    },
    // Google signs in to the account that already has its email instead of making a second one. better-auth
    // joins them only when that account's email is verified (requireLocalEmailVerified, the default), so
    // nobody can claim someone else's email first; emails here are always verified by their code.
    account: { modelName: "authAccounts", accountLinking: { enabled: true } },
    session: { modelName: "authSessions", expiresIn: 60 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
    verification: { modelName: "authVerifications", storeIdentifier: "hashed" },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "authRateLimits",
      window: 60,
      max: 100,
      customRules: { "/sign-in/email": { window: 60, max: 5 }, "/sign-in/phone-number": { window: 60, max: 5 } },
    },
    advanced: { cookiePrefix: "fatake", database: { generateId: false } },
    hooks: {
      // people the shop added on the Staff page (or from before better-auth) have no email yet,
      // which better-auth needs: give them the placeholder before their first code or login
      before: createAuthMiddleware(async (ctx) => {
        if (!["/phone-number/send-otp", "/phone-number/verify", "/sign-in/phone-number"].includes(ctx.path)) return;
        const phone = String(ctx.body?.phoneNumber ?? "");
        // a pipeline, so a name or date they already have is kept
        await db.collection("users").updateOne({ phone, email: { $exists: false } }, [
          {
            $set: {
              email: placeholderEmail(phone),
              emailVerified: false,
              name: { $ifNull: ["$name", "Customer"] },
              createdAt: { $ifNull: ["$createdAt", "$$NOW"] },
              updatedAt: "$$NOW",
            },
          },
        ]);
      }),
    },
    plugins: [
      phoneNumber({
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 5,
        phoneNumberValidator: (phone) => /^[6-9]\d{9}$/.test(phone),
        sendOTP: async ({ phoneNumber: phone, code }) => {
          if (mockOtp()) {
            mockChallenges.set(phone, { expiresAt: Date.now() + 10 * 60_000, attempts: 0 });
            return;
          }
          const problem = await sendCode(phone, code);
          if (problem) throw new APIError("BAD_REQUEST", { message: problem });
        },
        ...(mockOtp() && {
          verifyOTP: ({ phoneNumber: phone, code }) => {
            const challenge = mockChallenges.get(phone);
            if (!challenge || challenge.expiresAt <= Date.now() || challenge.attempts >= 5) {
              mockChallenges.delete(phone);
              return false;
            }
            challenge.attempts += 1;
            if (code !== (process.env.MOCK_OTP_CODE || "123456")) return false;
            mockChallenges.delete(phone);
            return true;
          },
        }),
        signUpOnVerification: { getTempEmail: placeholderEmail, getTempName: () => "Customer" },
        schema: { user: { fields: { phoneNumber: "phone", phoneNumberVerified: "phoneVerified" } } },
      }),
      // the free way in: a 6-digit code by email logs in (making the account if new) and proves the email
      emailOTP({
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 5,
        ...(mockOtp() && { generateOTP: () => process.env.MOCK_OTP_CODE || "123456" }),
        sendVerificationOTP: async ({ email, otp }) => {
          await sendEmail({ to: email, ...codeMail(otp) });
        },
      }),
      // lets server actions set the login cookie
      nextCookies(),
    ],
    telemetry: { enabled: false },
  });
}

let auth: Promise<ReturnType<typeof build>> | undefined;

/**
 * better-auth's indexes, and a fix for the old phone index: phone and email are unique only when
 * present, since Google accounts start without a phone and phone accounts without an email.
 */
async function ensureIndexes() {
  const db = mongoose.connection.db!;
  const users = db.collection("users");
  for (const field of ["phone", "email"]) {
    const old = (await users.indexes()).find((i) => i.name === `${field}_1`);
    if (old && !old.partialFilterExpression) await users.dropIndex(`${field}_1`);
    await users.createIndex({ [field]: 1 }, { name: `${field}_1`, unique: true, partialFilterExpression: { [field]: { $type: "string" } } });
  }
  await Promise.all([
    db.collection("authSessions").createIndex({ token: 1 }, { unique: true }),
    db.collection("authSessions").createIndex({ userId: 1 }),
    db.collection("authAccounts").createIndex({ userId: 1 }),
    db.collection("authAccounts").createIndex({ providerId: 1, accountId: 1 }),
    db.collection("authVerifications").createIndex({ identifier: 1 }),
    db.collection("authRateLimits").createIndex({ key: 1 }),
  ]);
}

/** One better-auth per server, made after the database connects. */
export function getAuth() {
  auth ??= connectDB()
    .then(ensureIndexes)
    .then(build)
    .catch((error) => {
      auth = undefined;
      throw error;
    });
  return auth;
}
