import { getAuth } from "@/lib/better-auth";

export const runtime = "nodejs";

/**
 * The app's own screens log people in through server actions that call better-auth directly, so the
 * only addresses the outside world needs are the ones other places send people back to: Google's
 * callback, the email confirmation link and the email reset link (plus better-auth's error page).
 * Everything else stays closed, so nobody can skip the app's own per-number limits (as in Agarwal Online).
 */
const PUBLIC_PATHS = [/^\/callback\/google$/, /^\/verify-email$/, /^\/reset-password\/[\w-]+$/, /^\/error$/];

const allowed = (request: Request) => PUBLIC_PATHS.some((pattern) => pattern.test(new URL(request.url).pathname.replace(/^\/api\/auth/, "")));
const closed = () => new Response("Not found", { status: 404 });

export async function GET(request: Request) {
  return allowed(request) ? (await getAuth()).handler(request) : closed();
}

export async function POST(request: Request) {
  return allowed(request) ? (await getAuth()).handler(request) : closed();
}
