import type { Metadata } from "next";
import Link from "next/link";
import { Rows } from "@/components/legal-rows";
import { shopDetails, TERMS_UPDATED, TERMS_VERSION } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy · Agarwal Stores",
  description: "What personal data Agarwal Stores collects, why, who sees it, how long it is kept, and your rights.",
};

/*
 * Written to the Digital Personal Data Protection Act, 2023 and the IT Act, 2000. Every claim here
 * matches the code: change what's collected or who it goes to, change this page (and TERMS_VERSION).
 */
export default async function PrivacyPage() {
  const shop = await shopDetails();
  return (
    <article className="legal">
      <h1>Privacy Policy</h1>
      <p className="muted">
        Last updated {TERMS_UPDATED} · Version {TERMS_VERSION}
      </p>

      <section id="who">
        <h2>Who we are</h2>
        <p>
          {shop.legalName}, {shop.address} (“we”) runs this website and decides how your personal data is used. Under the Digital Personal Data
          Protection Act, 2023 we are its Data Fiduciary. Questions and complaints go to our grievance officer, listed under{" "}
          <Link href="/terms#contact">Complaints</Link>.
        </p>
      </section>

      <section id="collect">
        <h2>What we collect</h2>
        <Rows
          rows={[
            ["Your account", "Name, mobile number, email, and your password, stored only as a one‑way hash that no one can read."],
            ["Google sign‑in", "Only if you use it: the name, email, profile picture link and account ID Google shares with us, and the sign‑in tokens Google issues for your account."],
            ["Delivery addresses", "Address, landmark, pincode, and the mobile number the delivery person should call."],
            ["Bookings and bills", "Items, prices, address, status, who delivered, the cash or UPI collected, the bill, and the version of our terms you agreed to."],
            ["Security records", "For logged‑in sessions and to stop repeated login attempts: IP address and browser details."],
          ]}
        />
        <p>We don’t collect your date of birth, ID documents, card or bank details, or your location.</p>
      </section>

      <section id="why">
        <h2>Why we use it</h2>
        <ul>
          <li>To create your account and keep it secure, including one‑time codes to check your number or email.</li>
          <li>To call you to confirm a booking, deliver it and collect payment.</li>
          <li>To answer your questions and complaints.</li>
          <li>To keep the records tax and consumer law require, and to stop fraud and misuse.</li>
        </ul>
        <p>We don’t sell your data, use it for advertising, or send you marketing messages.</p>
      </section>

      <section id="consent">
        <h2>Your consent</h2>
        <p>
          When you create an account or book, you agree to us using your details as this page describes. You can withdraw that consent at any time
          by asking us to delete your account. It doesn’t undo what was done before, and we can then no longer take bookings from you.
        </p>
      </section>

      <section id="sharing">
        <h2>Who sees it</h2>
        <Rows
          rows={[
            ["Our staff", "Shop staff see bookings to pack them. The delivery person sees the name, number, address and items of the bookings they deliver."],
            ["MongoDB Atlas", "Stores our database, in Mumbai."],
            ["Vercel", "Hosts the website, in Mumbai."],
            ["MiniMoth", "Sends one‑time codes by WhatsApp or SMS: your mobile number and the code."],
            ["Hostinger", "Sends our emails: your email address and the message."],
            ["Google", "If you log in with Google. And the delivery person’s Map button opens your delivery address in Google Maps."],
            ["Brand websites", "Some product pictures load from the makers’ websites, which see your IP address when your browser fetches them."],
            ["Authorities", "Police, courts or government bodies, only when the law requires it."],
          ]}
        />
        <p>These services handle data for us under their own security terms, and some may process it outside India, as the law allows.</p>
      </section>

      <section id="device">
        <h2>Cookies and your device</h2>
        <p>
          We use only what the site needs to work: a login cookie that keeps you logged in for up to 60 days (or until you log out), short‑lived cookies while you log in with Google, and your cart, kept in your own browser. No analytics, advertising or tracking
          cookies, so there is no cookie banner.
        </p>
      </section>

      <section id="keep">
        <h2>How long we keep it</h2>
        <ul>
          <li>One‑time codes: 10 minutes.</li>
          <li>Login sessions: up to 60 days, or until you log out.</li>
          <li>Records of login attempts (with the IP address): about a day.</li>
          <li>Your account and addresses: until you delete your account.</li>
          <li>
            Bookings and bills: at least as long as GST law requires (6 years). When you delete your account, your name, number and street address
            are removed from them (the pincode stays, for our sales by area), except on a bill of ₹50,000 or more before GST, which must show the
            buyer’s name and address.
          </li>
        </ul>
      </section>

      <section id="rights">
        <h2>Your rights</h2>
        <p>You can, at any time:</p>
        <ul>
          <li>see your details and bookings (on your Account and My Orders pages), or ask us for a summary of what we hold and who it went to;</li>
          <li>correct or update them (most of it on your Account page);</li>
          <li>delete your account and your data yourself, at the bottom of your <Link href="/account">Account</Link> page, except records the law makes us keep;</li>
          <li>name someone to use these rights for you if you die or can’t act yourself;</li>
          <li>complain to our grievance officer, and then to the Data Protection Board of India.</li>
        </ul>
        <p>
          <strong>How to ask:</strong> for anything not on your Account page, call or write to our grievance officer (see{" "}
          <Link href="/terms#contact">Complaints</Link>) from the mobile number or email on your account, so we know it’s you, and say what you
          want done. We reply within 30 days.
        </p>
      </section>

      <section id="safety">
        <h2>Keeping it safe</h2>
        <p>
          Passwords are stored only as hashes, the site runs only over HTTPS, and staff see only what their job needs. If a breach ever
          puts your data at risk, we will tell you and the Data Protection Board as the law requires.
        </p>
      </section>

      <section id="children">
        <h2>Children</h2>
        <p>This website is for adults. We don’t knowingly let anyone under 18 create an account or book.</p>
      </section>

      <section id="changes">
        <h2>Changes</h2>
        <p>If we change this policy, we update the date on top. Read it with our <Link href="/terms">Terms of Sale</Link>.</p>
      </section>
    </article>
  );
}
