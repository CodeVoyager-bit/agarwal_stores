import type { Metadata } from "next";
import Link from "next/link";
import { Rows } from "@/components/legal-rows";
import { shopDetails, TERMS_UPDATED, TERMS_VERSION } from "@/lib/legal";
import { DELIVERY_DAYS } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Terms of Sale · Agarwal Stores",
  description: "How booking, delivery, payment, cancellation and refunds work at Agarwal Stores, and how to complain.",
};

const SECTIONS = [
  ["who", "Who we are"],
  ["booking", "Booking, not online sale"],
  ["who-can-book", "Who can book"],
  ["crackers", "Our crackers"],
  ["prices", "Prices and payment"],
  ["delivery", "Delivery"],
  ["cancel", "Cancellation"],
  ["refunds", "Returns and refunds"],
  ["safety", "Safety and local rules"],
  ["account", "Your account"],
  ["contact", "Complaints and grievance officer"],
  ["law", "Law and changes"],
];

export default async function TermsPage() {
  const shop = await shopDetails();
  const phone = process.env.SHOP_PHONE;
  const call = phone && <a href={`tel:+91${phone}`}>+91 {phone}</a>;
  const mail = shop.email && <a href={`mailto:${shop.email}`}>{shop.email}</a>;
  return (
    <article className="legal">
      <h1>Terms of Sale</h1>
      <p className="muted">
        Last updated {TERMS_UPDATED} · Version {TERMS_VERSION}
      </p>
      <nav aria-label="On this page" className="legal-toc">
        <ol>
          {SECTIONS.map(([id, title]) => (
            <li key={id}>
              <a href={`#${id}`}>{title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="who">
        <h2>Who we are</h2>
        <p>This website is run by our shop. When you book here, you are dealing with:</p>
        <Rows
          rows={[
            ["Name", shop.legalName],
            ["Address", shop.address],
            ["GSTIN", shop.gstin],
            ["Fireworks licence", shop.licence],
            ["Phone", call],
            ["Email", mail],
          ]}
        />
      </section>

      <section id="booking">
        <h2>Booking, not online sale</h2>
        <p>
          The Supreme Court of India has stopped the online sale of crackers. So this website only takes <strong>bookings</strong>. A booking is a
          request, not a sale, and no money is taken online.
        </p>
        <ul>
          <li>After you book, we call you on the number you gave to confirm the items and the address.</li>
          <li>The sale happens at your door, from our licensed shop, when you receive the crackers and pay.</li>
          <li>If we can’t reach you, or can’t confirm the booking, we cancel it. Nothing is owed by either side.</li>
        </ul>
      </section>

      <section id="who-can-book">
        <h2>Who can book</h2>
        <ul>
          <li>You must be 18 or older. We don’t take bookings from children, and an adult must receive the delivery.</li>
          <li>It must be legal to buy and burst crackers where you live. Some cities and states ban them, fully or at times.</li>
          <li>We may refuse or cancel a booking we can’t lawfully or safely fill, for example an unusually large quantity.</li>
        </ul>
      </section>

      <section id="crackers">
        <h2>Our crackers</h2>
        <p>
          We sell only crackers that may lawfully be sold, made by licensed makers: green crackers that carry the CSIR‑NEERI green logo and QR
          code, without barium salts, as the Supreme Court requires. Pictures are for guidance; the box you get may look a little different.
        </p>
      </section>

      <section id="prices">
        <h2>Prices and payment</h2>
        <ul>
          <li>Prices are in Indian rupees and include GST. The MRP printed on the box is shown next to our price.</li>
          <li>The price you pay is the one shown when you booked. If it has to change, we tell you on the confirmation call first.</li>
          <li>You pay at the door, in cash or by UPI, only after you receive the crackers.</li>
          <li>After delivery, your bill is on My Orders, to view or print.</li>
          <li>
            <strong>We never ask for advance payment, a UPI request, card details or a code on a call.</strong> Anyone who does is not us. Please
            tell us.
          </li>
        </ul>
      </section>

      <section id="delivery">
        <h2>Delivery</h2>
        <ul>
          <li>Our own staff deliver, only in the area around our shop. If your address is outside it, we call you and cancel the booking.</li>
          <li>Delivery usually takes 3–{DELIVERY_DAYS} days after we confirm. Around Diwali it may take longer; we’ll tell you on the call.</li>
          <li>An adult must receive it. When it leaves the shop, you get a 6‑digit code on My Orders; read it out to the delivery person.</li>
          <li>Delivery is free.</li>
        </ul>
      </section>

      <section id="cancel">
        <h2>Cancellation</h2>
        <ul>
          <li>You can cancel at any time before you receive the crackers: call us, or tell the delivery person at the door. There is no charge.</li>
          <li>We may cancel if an item runs out, the address is outside our area, we can’t reach you, or the booking breaks these terms. We tell you why.</li>
          <li>As nothing is paid before delivery, there is nothing to refund for a cancelled booking.</li>
        </ul>
      </section>

      <section id="refunds">
        <h2>Returns and refunds</h2>
        <ul>
          <li>Check your crackers at the door. If anything is missing, damaged, wet or not what you booked, don’t take it: you don’t pay for it.</li>
          <li>
            If you find a fault after delivery, tell us within 2 days, and keep the item unused. We replace it, or refund what you paid for it in
            cash or by UPI within 7 days.
          </li>
          <li>For safety, we can’t take back crackers that are fine because you changed your mind. They can’t be stored or sold again once they’ve left us.</li>
        </ul>
      </section>

      <section id="safety">
        <h2>Safety and local rules</h2>
        <ul>
          <li>Follow the instructions on each box. Burst crackers outdoors, away from people, animals, vehicles and anything that can catch fire.</li>
          <li>Keep a bucket of water or sand nearby. Children may only use crackers with an adult watching.</li>
          <li>
            Burst crackers only at the times the Supreme Court, your state and your local police allow (on Diwali night, usually 8 pm to 10 pm), and
            never near hospitals, schools, courts or places of worship.
          </li>
          <li>Store them in a cool, dry place, away from flames and children.</li>
        </ul>
        <p>
          We are not responsible for harm caused by misuse, or by not following the instructions or the law. Nothing in these terms takes away your
          rights under the Consumer Protection Act, 2019.
        </p>
      </section>

      <section id="account">
        <h2>Your account</h2>
        <p>
          Keep your password to yourself; you are responsible for bookings made from your account. You can delete your account at any time on
          your Account page. Give a delivery number and address you’re
          allowed to use. How we handle your details is in our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section id="contact">
        <h2>Complaints and grievance officer</h2>
        <p>For anything about a booking, call us first. For a complaint, write to our grievance officer:</p>
        <Rows
          rows={[
            ["Grievance officer", shop.grievanceOfficer],
            ["Phone", call],
            ["Email", mail],
            ["Address", `${shop.legalName}, ${shop.address}`],
          ]}
        />
        <p>We acknowledge a complaint within 48 hours and settle it within one month.</p>
        <p>
          If you’re not satisfied, you can contact the National Consumer Helpline on <a href="tel:1915">1915</a> or at{" "}
          <a href="https://consumerhelpline.gov.in" target="_blank" rel="noopener noreferrer">
            consumerhelpline.gov.in
          </a>
          , or file a complaint with a consumer commission at{" "}
          <a href="https://edaakhil.nic.in" target="_blank" rel="noopener noreferrer">
            edaakhil.nic.in
          </a>
          .
        </p>
      </section>

      <section id="law">
        <h2>Law and changes</h2>
        <p>
          These terms are governed by the laws of India. Disputes go to the courts at {shop.courts}, without taking away your right to go to a
          consumer commission near you.
        </p>
        <p>
          We may update these terms. The version on top shows which ones apply; each booking keeps the version it was made under.
        </p>
      </section>
    </article>
  );
}
