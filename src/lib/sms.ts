/**
 * Sends a 6-digit code (login or delivery handover) through MiniMoth, the same hook as Agarwal
 * Online: WhatsApp first, then SMS. Returns a message for the person, or null when it went.
 */
export async function sendCode(phone: string, code: string) {
  if (!process.env.MINIMOTH_HOOK_URL || !process.env.MINIMOTH_HOOK_TOKEN) return "Codes by SMS are not set up yet. Please call the shop.";
  try {
    const response = await fetch(process.env.MINIMOTH_HOOK_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.MINIMOTH_HOOK_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ phone: `+91${phone}`, code }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`${response.status} ${(await response.text()).slice(0, 200)}`);
    return null;
  } catch (error) {
    // MiniMoth's reason (bad token, low balance) for the server log only
    console.error("MiniMoth code failed:", error instanceof Error ? error.message : error);
    return "We couldn't send the code. Please try again in a minute.";
  }
}

export const mockOtp = () => process.env.MOCK_OTP === "true" && process.env.NODE_ENV !== "production";
