// The Terms of Sale and Privacy Policy (server only). Legal text: keep every promise, number and time
// limit the same in all three. English counts if they differ; `note` says so on top of hi and mr.
// <b>…</b> is bold, other tags are links (see the pages). {placeholders} are filled with fill().

export const en = {
  note: "",
  updated: "Last updated {date} · Version {version}",
  toc: "On this page",
  // labels of the shop's details, by SHOP_FIELDS key (plus phone)
  rows: {
    legalName: "Name",
    address: "Address",
    gstin: "GSTIN",
    licence: "Fireworks licence",
    phone: "Phone",
    email: "Email",
    grievanceOfficer: "Grievance officer",
  },
  terms: {
    meta: {
      title: "Terms of Sale · Agarwal Stores",
      description: "How booking, delivery, payment, cancellation and refunds work at Agarwal Stores, and how to complain.",
    },
    title: "Terms of Sale",
    // section ids (footer links use #refunds and #contact) and their headings, in page order
    h: {
      who: "Who we are",
      booking: "Booking, not online sale",
      "who-can-book": "Who can book",
      crackers: "Our crackers",
      prices: "Prices and payment",
      delivery: "Delivery",
      cancel: "Cancellation",
      refunds: "Returns and refunds",
      safety: "Safety and local rules",
      account: "Your account",
      contact: "Complaints and grievance officer",
      law: "Law and changes",
    },
    who: "This website is run by our shop. When you book here, you are dealing with:",
    booking: {
      text: "The Supreme Court of India has stopped the online sale of crackers. So this website only takes <b>bookings</b>. A booking is a request, not a sale, and no money is taken online.",
      list: [
        "After you book, we call you on the number you gave to confirm the items and the address.",
        "The sale happens at your door, from our licensed shop, when you receive the crackers and pay.",
        "If we can’t reach you, or can’t confirm the booking, we cancel it. Nothing is owed by either side.",
      ],
    },
    whoCanBook: [
      "You must be 18 or older. We don’t take bookings from children, and an adult must receive the delivery.",
      "It must be legal to buy and burst crackers where you live. Some cities and states ban them, fully or at times.",
      "We may refuse or cancel a booking we can’t lawfully or safely fill, for example an unusually large quantity.",
    ],
    crackers:
      "We sell only crackers that may lawfully be sold, made by licensed makers. Pictures are for guidance; the box you get may look a little different.",
    prices: [
      "Prices are in Indian rupees and include GST. The MRP printed on the box is shown next to our price.",
      "The price you pay is the one shown when you booked. If it has to change, we tell you on the confirmation call first.",
      "You pay at the door, in cash or by UPI, only after you receive the crackers.",
      "You get a printed bill with your delivery.",
      "<b>We never ask for advance payment, a UPI request, card details or a code on a call.</b> Anyone who does is not us. Please tell us.",
    ],
    delivery: [
      "Our own staff deliver, only in the area around our shop. If your address is outside it, we call you and cancel the booking.",
      "We usually deliver {days} after we confirm. Around Diwali it may take longer; we’ll tell you on the call.",
      "An adult must receive it. When it leaves the shop, you get a 6‑digit code on My Orders; read it out to the delivery person.",
      "Delivery is free.",
    ],
    cancel: [
      "You can cancel at any time before you receive the crackers: call us, or refuse them at the door and the delivery person takes them back; we then cancel the booking. There is no charge.",
      "We may cancel if an item runs out, the address is outside our area, we can’t reach you, or the booking breaks these terms. We call to tell you why.",
      "As nothing is paid before delivery, there is nothing to refund for a cancelled booking.",
    ],
    refunds: [
      "Check your crackers at the door. If anything is missing, damaged, wet or not what you booked, don’t take it: you don’t pay for it.",
      "If you find a fault after delivery, tell us within 2 days, and keep the item unused. We replace it, or refund what you paid for it in cash or by UPI within 7 days.",
      "For safety, we can’t take back crackers that are fine because you changed your mind. They can’t be stored or sold again once they’ve left us.",
    ],
    safety: {
      list: [
        "Follow the instructions on each box. Burst crackers outdoors, away from people, animals, vehicles and anything that can catch fire.",
        "Keep a bucket of water or sand nearby. Children may only use crackers with an adult watching.",
        "Burst crackers only at the times the Supreme Court, your state and your local police allow (on Diwali night, usually 8 pm to 10 pm), and never near hospitals, schools, courts or places of worship.",
        "Store them in a cool, dry place, away from flames and children.",
      ],
      text: "We are not responsible for harm caused by misuse, or by not following the instructions or the law. Nothing in these terms takes away your rights under the Consumer Protection Act, 2019.",
    },
    account:
      "Keep your password to yourself; you are responsible for bookings made from your account. Once no booking is on its way, you can delete your account on your Account page. Give a delivery number and address you’re allowed to use. How we handle your details is in our <privacy>Privacy Policy</privacy>.",
    contact: {
      intro: "For anything about a booking, call us first. For a complaint, write to our grievance officer:",
      promise: "We acknowledge a complaint within 48 hours and settle it within one month.",
    },
    law: {
      courts: "These terms are governed by the laws of India. Disputes go to the courts at {courts}, without taking away your right to go to a consumer commission near you.",
      changes: "We may update these terms. The version on top shows which ones apply; each booking keeps the version it was made under.",
    },
  },
  privacy: {
    meta: {
      title: "Privacy Policy · Agarwal Stores",
      description: "What personal data Agarwal Stores collects, why, who sees it, how long it is kept, and your rights.",
    },
    title: "Privacy Policy",
    h: {
      who: "Who we are",
      collect: "What we collect",
      why: "Why we use it",
      consent: "Your consent",
      sharing: "Who sees it",
      device: "Cookies and your device",
      keep: "How long we keep it",
      rights: "Your rights",
      safety: "Keeping it safe",
      children: "Children",
      changes: "Changes",
    },
    who: "{name}, {address} (“we”) runs this website and decides how your personal data is used. Under the Digital Personal Data Protection Act, 2023 we are its Data Fiduciary. Questions and complaints go to our grievance officer, listed under <complaints>Complaints</complaints>.",
    collect: {
      rows: [
        ["Your account", "Name, mobile number, email, and your password, stored only as a one‑way hash that no one can read."],
        ["Google sign‑in", "Only if you use it: the name, email, profile picture link and account ID Google shares with us, and the sign‑in tokens Google issues for your account."],
        ["Delivery addresses", "Address, landmark, pincode, and the mobile number the delivery person should call."],
        ["Bookings and bills", "Items, prices, address, status, who delivered, the cash or UPI collected, the bill, and the version of our terms you agreed to."],
        ["Security records", "For logged‑in sessions and to stop repeated login attempts: IP address and browser details."],
      ] as [string, string][],
      text: "We don’t collect your date of birth, ID documents, card or bank details, or your location.",
    },
    why: {
      list: [
        "To create your account and keep it secure, including one‑time codes to check your number or email.",
        "To call you to confirm a booking, deliver it and collect payment.",
        "To answer your questions and complaints.",
        "To keep the records tax and consumer law require, and to stop fraud and misuse.",
      ],
      text: "We don’t sell your data, use it for advertising, or send you marketing messages.",
    },
    consent:
      "When you create an account or book, you agree to us using your details as this page describes. You can withdraw that consent at any time by asking us to delete your account. It doesn’t undo what was done before, and we can then no longer take bookings from you.",
    sharing: {
      rows: [
        ["Our staff", "Shop staff see bookings to pack them. The delivery person sees the name, number, address and items of the bookings they deliver."],
        ["MongoDB Atlas", "Stores our database, in Mumbai."],
        ["Vercel", "Hosts the website, in Mumbai."],
        ["MiniMoth", "Sends one‑time codes by WhatsApp or SMS: your mobile number and the code."],
        ["Hostinger", "Sends our emails: your email address and the message."],
        ["Google", "If you log in with Google. And the delivery person’s Map button opens your delivery address in Google Maps."],
        ["Brand websites", "Most product pictures from the makers’ websites are fetched for us by Vercel, so those websites don’t see you. A few load straight from the maker’s website, which then sees your IP address."],
        ["Authorities", "Police, courts or government bodies, only when the law requires it."],
      ] as [string, string][],
      text: "These services handle data for us under their own security terms, and some may process it outside India, as the law allows.",
    },
    device:
      "We use only what the site needs to work: a login cookie that keeps you logged in for up to 60 days (or until you log out), a language cookie that remembers the language you picked for 1 year, short‑lived cookies while you log in with Google, and your cart with its booking number, kept in your own browser. The installed app is this same website and keeps nothing more. No analytics, advertising or tracking cookies, so there is no cookie banner.",
    keep: [
      "One‑time codes: 10 minutes.",
      "Login sessions: up to 60 days, or until you log out.",
      "Records of login attempts (with the IP address): about a day.",
      "Your account and addresses: until you delete your account.",
      "Bookings and bills: at least as long as GST law requires (6 years). When you delete your account, your name, number and street address are removed from them (the pincode stays, for our sales by area), except on a bill of ₹50,000 or more before GST, which must show the buyer’s name and address.",
    ],
    rights: {
      intro: "You can, at any time:",
      list: [
        "see your details and bookings (on your Account and My Orders pages), or ask us for a summary of what we hold and who it went to;",
        "correct or update them (most of it on your Account page);",
        "delete your account and your data yourself, at the bottom of your <account>Account</account> page, except records the law makes us keep;",
        "name someone to use these rights for you if you die or can’t act yourself;",
        "complain to our grievance officer, and then to the Data Protection Board of India.",
      ],
      how: "<b>How to ask:</b> for anything not on your Account page, call or write to our grievance officer (see <complaints>Complaints</complaints>) from the mobile number or email on your account, so we know it’s you, and say what you want done. We reply within 30 days.",
    },
    safety:
      "Passwords are stored only as hashes, the site runs only over HTTPS, and staff see only what their job needs. If a breach ever puts your data at risk, we will tell you and the Data Protection Board as the law requires.",
    children: "This website is for adults. We don’t knowingly let anyone under 18 create an account or book.",
    changes: "If we change this policy, we update the date on top. Read it with our <terms>Terms of Sale</terms>.",
  },
};

export const hi: typeof en = {
  note: "यह हिंदी अनुवाद आपकी सुविधा के लिए है। अगर इसमें और अंग्रेज़ी (English) वाले में कोई फ़र्क हो, तो अंग्रेज़ी वाला ही मान्य होगा। उसे पढ़ने के लिए ऊपर भाषा मेनू में English चुनें।",
  updated: "पिछला अपडेट {date} · वर्ज़न {version}",
  toc: "इस पेज पर",
  rows: {
    legalName: "नाम",
    address: "पता",
    gstin: "GSTIN",
    licence: "पटाखों का लाइसेंस",
    phone: "फ़ोन",
    email: "ईमेल",
    grievanceOfficer: "शिकायत अधिकारी",
  },
  terms: {
    meta: {
      title: "बिक्री की शर्तें · Agarwal Stores",
      description: "Agarwal Stores पर बुकिंग, डिलीवरी, भुगतान, रद्द करना और रिफ़ंड कैसे होते हैं, और शिकायत कैसे करें।",
    },
    title: "बिक्री की शर्तें",
    h: {
      who: "हम कौन हैं",
      booking: "बुकिंग, ऑनलाइन बिक्री नहीं",
      "who-can-book": "कौन बुक कर सकता है",
      crackers: "हमारे पटाखे",
      prices: "कीमत और भुगतान",
      delivery: "डिलीवरी",
      cancel: "रद्द करना",
      refunds: "वापसी और रिफ़ंड",
      safety: "सुरक्षा और स्थानीय नियम",
      account: "आपका खाता",
      contact: "शिकायतें और शिकायत अधिकारी",
      law: "कानून और बदलाव",
    },
    who: "यह वेबसाइट हमारी दुकान चलाती है। यहाँ बुक करने पर आपका लेन-देन इनसे है:",
    booking: {
      text: "भारत के सुप्रीम कोर्ट ने पटाखों की ऑनलाइन बिक्री पर रोक लगाई है। इसलिए यह वेबसाइट सिर्फ़ <b>बुकिंग</b> लेती है। बुकिंग एक अनुरोध है, बिक्री नहीं, और ऑनलाइन कोई पैसा नहीं लिया जाता।",
      list: [
        "बुक करने के बाद, सामान और पता पक्का करने के लिए हम आपके दिए नंबर पर फ़ोन करते हैं।",
        "बिक्री आपके दरवाज़े पर, हमारी लाइसेंस वाली दुकान से होती है, जब आप पटाखे लेते हैं और भुगतान करते हैं।",
        "अगर हम आपसे संपर्क नहीं कर पाते, या बुकिंग पक्की नहीं कर पाते, तो हम उसे रद्द कर देते हैं। किसी भी तरफ़ का कुछ बकाया नहीं रहता।",
      ],
    },
    whoCanBook: [
      "आपकी उम्र 18 साल या उससे ज़्यादा होनी चाहिए। हम बच्चों से बुकिंग नहीं लेते, और डिलीवरी किसी बड़े (वयस्क) को ही लेनी होगी।",
      "आप जहाँ रहते हैं, वहाँ पटाखे खरीदना और फोड़ना कानूनी होना चाहिए। कुछ शहरों और राज्यों में इन पर पूरी तरह या कुछ समय के लिए रोक होती है।",
      "जो बुकिंग हम कानूनी या सुरक्षित तरीके से पूरी नहीं कर सकते, उसे हम मना या रद्द कर सकते हैं, जैसे सामान्य से बहुत ज़्यादा मात्रा।",
    ],
    crackers:
      "हम सिर्फ़ वही पटाखे बेचते हैं जिन्हें कानूनी तौर पर बेचा जा सकता है और जो लाइसेंस वाले निर्माताओं ने बनाए हैं। तस्वीरें सिर्फ़ अंदाज़े के लिए हैं; आपको मिलने वाला डिब्बा थोड़ा अलग दिख सकता है।",
    prices: [
      "कीमतें भारतीय रुपये में हैं और इनमें GST शामिल है। डिब्बे पर छपी MRP हमारी कीमत के साथ दिखाई जाती है।",
      "आप वही कीमत देते हैं जो बुक करते समय दिखाई गई थी। अगर उसे बदलना पड़े, तो हम पहले कन्फ़र्मेशन कॉल पर आपको बताते हैं।",
      "आप पटाखे मिलने के बाद ही, दरवाज़े पर, नकद या UPI से भुगतान करते हैं।",
      "डिलीवरी के साथ आपको छपा हुआ बिल मिलता है।",
      "<b>हम कभी भी एडवांस भुगतान, UPI रिक्वेस्ट, कार्ड की जानकारी या कॉल पर कोई कोड नहीं माँगते।</b> जो कोई ऐसा करे, वह हम नहीं हैं। कृपया हमें बताएँ।",
    ],
    delivery: [
      "डिलीवरी हमारा अपना स्टाफ़ करता है, सिर्फ़ हमारी दुकान के आस-पास के इलाके में। अगर आपका पता इस इलाके से बाहर है, तो हम आपको फ़ोन करके बुकिंग रद्द कर देते हैं।",
      "हमारे बुकिंग पक्की करने के बाद आम तौर पर {days} डिलीवरी हो जाती है। दिवाली के आस-पास ज़्यादा समय लग सकता है; यह हम कॉल पर बता देंगे।",
      "डिलीवरी किसी बड़े (वयस्क) को ही लेनी होगी। जब ऑर्डर दुकान से निकलता है, तो ‘मेरे ऑर्डर’ में आपको 6 अंकों का कोड मिलता है; उसे डिलीवरी करने वाले को पढ़कर बताएँ।",
      "डिलीवरी मुफ़्त है।",
    ],
    cancel: [
      "पटाखे मिलने से पहले आप कभी भी रद्द कर सकते हैं: हमें फ़ोन करें, या दरवाज़े पर लेने से मना कर दें, तो डिलीवरी करने वाले उन्हें वापस ले जाएँगे; फिर हम बुकिंग रद्द कर देते हैं। इसका कोई चार्ज नहीं है।",
      "अगर कोई सामान खत्म हो जाए, पता हमारे इलाके से बाहर हो, हम आपसे संपर्क न कर पाएँ, या बुकिंग इन शर्तों के खिलाफ़ हो, तो हम बुकिंग रद्द कर सकते हैं। हम फ़ोन करके वजह बताते हैं।",
      "डिलीवरी से पहले कोई भुगतान नहीं होता, इसलिए रद्द हुई बुकिंग पर रिफ़ंड करने को कुछ नहीं होता।",
    ],
    refunds: [
      "पटाखे दरवाज़े पर ही जाँच लें। अगर कुछ कम हो, टूटा-फूटा हो, गीला हो या वह न हो जो आपने बुक किया था, तो उसे न लें: उसका भुगतान आपको नहीं करना है।",
      "अगर डिलीवरी के बाद कोई खराबी दिखे, तो 2 दिन के अंदर हमें बताएँ, और उस सामान का इस्तेमाल न करें। हम उसे बदल देते हैं, या उसके लिए दिए पैसे 7 दिन के अंदर नकद या UPI से लौटा देते हैं।",
      "सुरक्षा की वजह से, हम ठीक-ठाक पटाखे सिर्फ़ इसलिए वापस नहीं ले सकते कि आपका मन बदल गया। एक बार हमारे यहाँ से निकलने के बाद उन्हें दोबारा रखा या बेचा नहीं जा सकता।",
    ],
    safety: {
      list: [
        "हर डिब्बे पर लिखे निर्देशों का पालन करें। पटाखे खुली जगह में फोड़ें, लोगों, जानवरों, गाड़ियों और आग पकड़ सकने वाली किसी भी चीज़ से दूर।",
        "पास में पानी या रेत की एक बाल्टी रखें। बच्चे पटाखे सिर्फ़ किसी बड़े की निगरानी में ही चलाएँ।",
        "पटाखे सिर्फ़ उसी समय फोड़ें जिसकी इजाज़त सुप्रीम कोर्ट, आपका राज्य और आपकी स्थानीय पुलिस देती है (दिवाली की रात, आम तौर पर रात 8 से 10 बजे तक), और अस्पताल, स्कूल, अदालत या पूजा-स्थलों के पास कभी नहीं।",
        "उन्हें ठंडी, सूखी जगह पर, आग और बच्चों से दूर रखें।",
      ],
      text: "गलत इस्तेमाल से, या निर्देशों या कानून का पालन न करने से हुए नुकसान के लिए हम ज़िम्मेदार नहीं हैं। इन शर्तों की कोई भी बात उपभोक्ता संरक्षण अधिनियम, 2019 के तहत आपके अधिकार नहीं छीनती।",
    },
    account:
      "अपना पासवर्ड किसी को न बताएँ; आपके खाते से हुई बुकिंग की ज़िम्मेदारी आपकी है। जब आपकी कोई भी बुकिंग आनी बाकी न हो, तब आप ‘खाता’ पेज पर अपना खाता हटा सकते हैं। डिलीवरी के लिए वही नंबर और पता दें जिसे इस्तेमाल करने की आपको इजाज़त है। हम आपकी जानकारी कैसे संभालते हैं, यह हमारी <privacy>गोपनीयता नीति</privacy> में है।",
    contact: {
      intro: "बुकिंग से जुड़ी किसी भी बात के लिए पहले हमें फ़ोन करें। शिकायत के लिए हमारे शिकायत अधिकारी को लिखें:",
      promise: "हम 48 घंटे के अंदर शिकायत मिलने की पुष्टि करते हैं और एक महीने के अंदर उसका निपटारा करते हैं।",
    },
    law: {
      courts: "ये शर्तें भारत के कानूनों के तहत हैं। विवाद {courts} की अदालतों में जाएँगे, इससे आपके पास के उपभोक्ता आयोग में जाने का आपका अधिकार खत्म नहीं होता।",
      changes: "हम इन शर्तों को अपडेट कर सकते हैं। ऊपर लिखा वर्ज़न बताता है कि कौन-सी शर्तें लागू हैं; हर बुकिंग पर वही वर्ज़न लागू रहता है जिसके तहत वह की गई थी।",
    },
  },
  privacy: {
    meta: {
      title: "गोपनीयता नीति · Agarwal Stores",
      description: "Agarwal Stores कौन-सा निजी डेटा लेता है, क्यों, उसे कौन देखता है, उसे कितने समय तक रखा जाता है, और आपके अधिकार।",
    },
    title: "गोपनीयता नीति",
    h: {
      who: "हम कौन हैं",
      collect: "हम क्या जानकारी लेते हैं",
      why: "हम इसका इस्तेमाल क्यों करते हैं",
      consent: "आपकी सहमति",
      sharing: "इसे कौन देखता है",
      device: "कुकीज़ और आपका डिवाइस",
      keep: "हम इसे कितने समय तक रखते हैं",
      rights: "आपके अधिकार",
      safety: "इसे सुरक्षित रखना",
      children: "बच्चे",
      changes: "बदलाव",
    },
    who: "{name}, {address} (“हम”) यह वेबसाइट चलाते हैं और तय करते हैं कि आपका निजी डेटा कैसे इस्तेमाल हो। डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 के तहत हम इसके डेटा फ़िड्यूशरी (Data Fiduciary) हैं। सवाल और शिकायतें हमारे शिकायत अधिकारी के पास जाती हैं, जिनकी जानकारी <complaints>शिकायतें</complaints> में दी गई है।",
    collect: {
      rows: [
        ["आपका खाता", "नाम, मोबाइल नंबर, ईमेल, और आपका पासवर्ड, जो सिर्फ़ एक-तरफ़ा हैश (one‑way hash) के रूप में रखा जाता है जिसे कोई पढ़ नहीं सकता।"],
        ["Google से साइन इन", "सिर्फ़ तब, जब आप इसका इस्तेमाल करें: Google हमारे साथ जो नाम, ईमेल, प्रोफ़ाइल फ़ोटो का लिंक और खाते की ID शेयर करता है, और Google आपके खाते के लिए जो साइन-इन टोकन जारी करता है।"],
        ["डिलीवरी के पते", "पता, लैंडमार्क, पिनकोड, और वह मोबाइल नंबर जिस पर डिलीवरी करने वाले फ़ोन करें।"],
        ["बुकिंग और बिल", "सामान, कीमतें, पता, स्टेटस, डिलीवरी किसने की, लिया गया नकद या UPI भुगतान, बिल, और हमारी शर्तों का वह वर्ज़न जिस पर आपने सहमति दी।"],
        ["सुरक्षा रिकॉर्ड", "लॉग इन सेशन के लिए और बार-बार लॉग इन की कोशिशें रोकने के लिए: IP एड्रेस और ब्राउज़र की जानकारी।"],
      ],
      text: "हम आपकी जन्मतिथि, पहचान के दस्तावेज़, कार्ड या बैंक की जानकारी, या आपकी लोकेशन नहीं लेते।",
    },
    why: {
      list: [
        "आपका खाता बनाने और उसे सुरक्षित रखने के लिए, जिसमें आपका नंबर या ईमेल जाँचने के लिए वन-टाइम कोड भी शामिल हैं।",
        "बुकिंग पक्की करने के लिए आपको फ़ोन करने, उसकी डिलीवरी करने और भुगतान लेने के लिए।",
        "आपके सवालों और शिकायतों का जवाब देने के लिए।",
        "टैक्स और उपभोक्ता कानून के तहत ज़रूरी रिकॉर्ड रखने के लिए, और धोखाधड़ी और गलत इस्तेमाल रोकने के लिए।",
      ],
      text: "हम आपका डेटा नहीं बेचते, उसे विज्ञापन के लिए इस्तेमाल नहीं करते, और आपको मार्केटिंग मैसेज नहीं भेजते।",
    },
    consent:
      "जब आप खाता बनाते हैं या बुक करते हैं, तो आप सहमति देते हैं कि हम आपकी जानकारी का इस्तेमाल वैसे करें जैसा इस पेज पर बताया गया है। आप हमसे अपना खाता हटाने को कहकर यह सहमति कभी भी वापस ले सकते हैं। इससे पहले हो चुका काम पलटता नहीं है, और उसके बाद हम आपसे बुकिंग नहीं ले सकेंगे।",
    sharing: {
      rows: [
        ["हमारा स्टाफ़", "दुकान का स्टाफ़ बुकिंग पैक करने के लिए उन्हें देखता है। डिलीवरी करने वाले, जिन बुकिंग की डिलीवरी करते हैं, उनका नाम, नंबर, पता और सामान देखते हैं।"],
        ["MongoDB Atlas", "हमारा डेटाबेस रखता है, मुंबई में।"],
        ["Vercel", "वेबसाइट होस्ट करता है, मुंबई में।"],
        ["MiniMoth", "WhatsApp या SMS से वन-टाइम कोड भेजता है: आपका मोबाइल नंबर और कोड।"],
        ["Hostinger", "हमारे ईमेल भेजता है: आपका ईमेल पता और मैसेज।"],
        ["Google", "अगर आप Google से लॉग इन करते हैं। और डिलीवरी करने वाले का ‘नक्शा’ बटन आपका डिलीवरी पता Google Maps में खोलता है।"],
        ["ब्रांड की वेबसाइटें", "निर्माताओं की वेबसाइटों से ज़्यादातर प्रोडक्ट की तस्वीरें Vercel हमारे लिए लाता है, इसलिए वे वेबसाइटें आपको नहीं देखतीं। कुछ तस्वीरें सीधे निर्माता की वेबसाइट से लोड होती हैं, और तब वह वेबसाइट आपका IP एड्रेस देखती है।"],
        ["सरकारी अधिकारी", "पुलिस, अदालतें या सरकारी संस्थाएँ, सिर्फ़ तब जब कानून के तहत ज़रूरी हो।"],
      ],
      text: "ये सेवाएँ हमारे लिए डेटा अपनी सुरक्षा शर्तों के तहत संभालती हैं, और इनमें से कुछ, कानून की इजाज़त के मुताबिक, उसे भारत के बाहर भी प्रोसेस कर सकती हैं।",
    },
    device:
      "हम सिर्फ़ वही इस्तेमाल करते हैं जो साइट चलाने के लिए ज़रूरी है: एक लॉग इन कुकी जो आपको 60 दिन तक (या लॉग आउट करने तक) लॉग इन रखती है, एक भाषा कुकी जो आपकी चुनी हुई भाषा 1 साल तक याद रखती है, Google से लॉग इन करते समय कुछ देर की कुकीज़, और आपका कार्ट उसके बुकिंग नंबर के साथ, जो आपके अपने ब्राउज़र में रहता है। इंस्टॉल किया गया ऐप यही वेबसाइट है और इससे ज़्यादा कुछ नहीं रखता। कोई एनालिटिक्स, विज्ञापन या ट्रैकिंग कुकी नहीं, इसलिए कोई कुकी बैनर नहीं है।",
    keep: [
      "वन-टाइम कोड: 10 मिनट।",
      "लॉग इन सेशन: 60 दिन तक, या लॉग आउट करने तक।",
      "लॉग इन की कोशिशों का रिकॉर्ड (IP एड्रेस के साथ): लगभग एक दिन।",
      "आपका खाता और पते: जब तक आप अपना खाता नहीं हटाते।",
      "बुकिंग और बिल: कम से कम उतने समय तक जितना GST कानून में ज़रूरी है (6 साल)। जब आप अपना खाता हटाते हैं, तो इनमें से आपका नाम, नंबर और घर/गली का पता हटा दिया जाता है (इलाके के हिसाब से हमारी बिक्री के लिए पिनकोड रहता है), सिवाय GST से पहले ₹50,000 या उससे ज़्यादा के बिल के, जिस पर खरीदार का नाम और पता दिखाना ज़रूरी है।",
    ],
    rights: {
      intro: "आप कभी भी:",
      list: [
        "अपनी जानकारी और बुकिंग देख सकते हैं (‘खाता’ और ‘मेरे ऑर्डर’ पेज पर), या हमसे इसका सार माँग सकते हैं कि हमारे पास क्या जानकारी है और वह किसे दी गई;",
        "उसे सुधार या अपडेट कर सकते हैं (ज़्यादातर ‘खाता’ पेज पर);",
        "अपना खाता और अपना डेटा खुद हटा सकते हैं, अपने <account>खाता</account> पेज के सबसे नीचे, सिवाय उन रिकॉर्ड के जो कानून के तहत हमें रखने होते हैं;",
        "किसी व्यक्ति को नामित कर सकते हैं, जो आपकी मृत्यु होने पर या आपके खुद कुछ न कर पाने पर आपकी ओर से इन अधिकारों का इस्तेमाल करे;",
        "हमारे शिकायत अधिकारी से शिकायत कर सकते हैं, और फिर भारतीय डेटा संरक्षण बोर्ड (Data Protection Board of India) से।",
      ],
      how: "<b>कैसे माँगें:</b> जो चीज़ ‘खाता’ पेज पर नहीं है, उसके लिए अपने खाते वाले मोबाइल नंबर या ईमेल से हमारे शिकायत अधिकारी को फ़ोन करें या लिखें (देखें <complaints>शिकायतें</complaints>), ताकि हमें पता चले कि यह आप ही हैं, और बताएँ कि आप क्या करवाना चाहते हैं। हम 30 दिन के अंदर जवाब देते हैं।",
    },
    safety:
      "पासवर्ड सिर्फ़ हैश के रूप में रखे जाते हैं, साइट सिर्फ़ HTTPS पर चलती है, और स्टाफ़ सिर्फ़ उतना ही देखता है जितना उनके काम के लिए ज़रूरी है। अगर कभी डेटा में सेंध लगने से आपका डेटा खतरे में पड़े, तो हम कानून के मुताबिक आपको और डेटा संरक्षण बोर्ड को बताएँगे।",
    children: "यह वेबसाइट वयस्कों के लिए है। हम जान-बूझकर 18 साल से कम उम्र के किसी को खाता बनाने या बुक करने नहीं देते।",
    changes: "अगर हम यह नीति बदलते हैं, तो ऊपर की तारीख अपडेट कर देते हैं। इसे हमारी <terms>बिक्री की शर्तों</terms> के साथ पढ़ें।",
  },
};

export const mr: typeof en = {
  note: "हे मराठी भाषांतर तुमच्या सोयीसाठी आहे. यात आणि इंग्रजी (English) मजकुरात काही फरक असल्यास इंग्रजी मजकूरच ग्राह्य धरला जाईल. तो वाचण्यासाठी वरच्या भाषा मेनूमध्ये English निवडा.",
  updated: "शेवटचे अपडेट {date} · व्हर्जन {version}",
  toc: "या पानावर",
  rows: {
    legalName: "नाव",
    address: "पत्ता",
    gstin: "GSTIN",
    licence: "फटाक्यांचा परवाना",
    phone: "फोन",
    email: "ईमेल",
    grievanceOfficer: "तक्रार अधिकारी",
  },
  terms: {
    meta: {
      title: "विक्रीच्या अटी · Agarwal Stores",
      description: "Agarwal Stores वर बुकिंग, डिलिव्हरी, पेमेंट, रद्द करणे आणि परतावा कसे होतात, आणि तक्रार कशी करावी.",
    },
    title: "विक्रीच्या अटी",
    h: {
      who: "आम्ही कोण आहोत",
      booking: "बुकिंग, ऑनलाइन विक्री नाही",
      "who-can-book": "कोण बुक करू शकते",
      crackers: "आमचे फटाके",
      prices: "किंमत आणि पेमेंट",
      delivery: "डिलिव्हरी",
      cancel: "रद्द करणे",
      refunds: "परत करणे आणि परतावा",
      safety: "सुरक्षा आणि स्थानिक नियम",
      account: "तुमचे खाते",
      contact: "तक्रारी आणि तक्रार अधिकारी",
      law: "कायदा आणि बदल",
    },
    who: "ही वेबसाइट आमचे दुकान चालवते. इथे बुक केल्यावर तुमचा व्यवहार यांच्याशी आहे:",
    booking: {
      text: "भारताच्या सुप्रीम कोर्टाने फटाक्यांच्या ऑनलाइन विक्रीवर बंदी घातली आहे. म्हणून ही वेबसाइट फक्त <b>बुकिंग</b> घेते. बुकिंग ही एक विनंती आहे, विक्री नाही, आणि ऑनलाइन कोणतेही पैसे घेतले जात नाहीत.",
      list: [
        "बुक केल्यानंतर, वस्तू आणि पत्ता पक्का करण्यासाठी आम्ही तुम्ही दिलेल्या नंबरवर फोन करतो.",
        "विक्री तुमच्या दारात, आमच्या परवानाधारक दुकानाकडून होते, जेव्हा तुम्ही फटाके घेता आणि पैसे देता.",
        "आम्ही तुमच्याशी संपर्क करू शकलो नाही, किंवा बुकिंग पक्की करू शकलो नाही, तर आम्ही ती रद्द करतो. कोणत्याही बाजूचे काहीही देणे राहत नाही.",
      ],
    },
    whoCanBook: [
      "तुमचे वय 18 वर्षे किंवा त्याहून जास्त असले पाहिजे. आम्ही लहान मुलांकडून बुकिंग घेत नाही, आणि डिलिव्हरी प्रौढ व्यक्तीनेच घेतली पाहिजे.",
      "तुम्ही जिथे राहता तिथे फटाके विकत घेणे आणि फोडणे कायदेशीर असले पाहिजे. काही शहरांत आणि राज्यांत त्यांच्यावर पूर्ण किंवा काही वेळेसाठी बंदी असते.",
      "जी बुकिंग आम्ही कायदेशीरपणे किंवा सुरक्षितपणे पूर्ण करू शकत नाही, ती आम्ही नाकारू किंवा रद्द करू शकतो, उदाहरणार्थ नेहमीपेक्षा खूप जास्त प्रमाण.",
    ],
    crackers:
      "आम्ही फक्त कायदेशीरपणे विकता येणारे, परवानाधारक उत्पादकांनी बनवलेले फटाके विकतो. चित्रे फक्त कल्पना येण्यासाठी आहेत; तुम्हाला मिळणारा बॉक्स थोडा वेगळा दिसू शकतो.",
    prices: [
      "किमती भारतीय रुपयांत आहेत आणि त्यात GST समाविष्ट आहे. बॉक्सवर छापलेली MRP आमच्या किमतीच्या शेजारी दाखवली जाते.",
      "तुम्ही बुक करताना दाखवलेलीच किंमत देता. ती बदलावी लागली, तर आम्ही आधी कन्फर्मेशन कॉलवर तुम्हाला सांगतो.",
      "तुम्ही फटाके मिळाल्यानंतरच, दारात, रोख किंवा UPI ने पैसे देता.",
      "डिलिव्हरीसोबत तुम्हाला छापील बिल मिळते.",
      "<b>आम्ही कधीही आगाऊ पैसे, UPI रिक्वेस्ट, कार्डची माहिती किंवा फोनवर कोणताही कोड मागत नाही.</b> जो कोणी असे मागेल, ते आम्ही नाही. कृपया आम्हाला कळवा.",
    ],
    delivery: [
      "डिलिव्हरी आमचा स्वतःचा स्टाफ करतो, फक्त आमच्या दुकानाच्या आसपासच्या भागात. तुमचा पत्ता त्या भागाबाहेर असल्यास, आम्ही तुम्हाला फोन करून बुकिंग रद्द करतो.",
      "आम्ही बुकिंग पक्की केल्यानंतर साधारण {days} डिलिव्हरी होते. दिवाळीच्या आसपास जास्त वेळ लागू शकतो; ते आम्ही फोनवर सांगू.",
      "डिलिव्हरी प्रौढ व्यक्तीनेच घेतली पाहिजे. ऑर्डर दुकानातून निघाल्यावर ‘माझ्या ऑर्डर’ मध्ये तुम्हाला 6 अंकी कोड मिळतो; तो डिलिव्हरी करणाऱ्यांना वाचून सांगा.",
      "डिलिव्हरी मोफत आहे.",
    ],
    cancel: [
      "फटाके मिळण्यापूर्वी तुम्ही कधीही रद्द करू शकता: आम्हाला फोन करा, किंवा दारात घेण्यास नकार द्या, मग डिलिव्हरी करणारे ते परत नेतात; त्यानंतर आम्ही बुकिंग रद्द करतो. याचे कोणतेही शुल्क नाही.",
      "एखादी वस्तू संपली, पत्ता आमच्या भागाबाहेर असला, आम्ही तुमच्याशी संपर्क करू शकलो नाही, किंवा बुकिंग या अटींच्या विरोधात असली, तर आम्ही ती रद्द करू शकतो. आम्ही फोन करून कारण सांगतो.",
      "डिलिव्हरीपूर्वी काहीही पैसे दिले जात नाहीत, म्हणून रद्द झालेल्या बुकिंगसाठी परत करण्यासारखे काहीच नसते.",
    ],
    refunds: [
      "फटाके दारातच तपासा. काही कमी असेल, खराब झालेले, ओले किंवा तुम्ही बुक केलेले नसेल, तर ते घेऊ नका: त्याचे पैसे तुम्ही देत नाही.",
      "डिलिव्हरीनंतर काही दोष आढळल्यास, 2 दिवसांच्या आत आम्हाला सांगा, आणि ती वस्तू न वापरता ठेवा. आम्ही ती बदलून देतो, किंवा तुम्ही तिच्यासाठी दिलेले पैसे 7 दिवसांच्या आत रोख किंवा UPI ने परत करतो.",
      "सुरक्षेसाठी, तुमचा विचार बदलला म्हणून आम्ही चांगले असलेले फटाके परत घेऊ शकत नाही. एकदा आमच्याकडून बाहेर गेल्यावर ते पुन्हा साठवता किंवा विकता येत नाहीत.",
    ],
    safety: {
      list: [
        "प्रत्येक बॉक्सवरील सूचनांचे पालन करा. फटाके मोकळ्या जागेत फोडा, माणसे, प्राणी, वाहने आणि आग पकडू शकणाऱ्या कोणत्याही गोष्टीपासून दूर.",
        "जवळ पाणी किंवा वाळूची एक बादली ठेवा. मुलांनी फटाके फक्त मोठ्या व्यक्तीच्या देखरेखीखालीच वापरावेत.",
        "फटाके फक्त सुप्रीम कोर्ट, तुमचे राज्य आणि तुमचे स्थानिक पोलीस परवानगी देतात त्या वेळेतच फोडा (दिवाळीच्या रात्री, साधारण रात्री 8 ते 10), आणि रुग्णालये, शाळा, न्यायालये किंवा प्रार्थनास्थळांजवळ कधीच नाही.",
        "ते थंड, कोरड्या जागी, आग आणि लहान मुलांपासून दूर ठेवा.",
      ],
      text: "चुकीच्या वापरामुळे, किंवा सूचना किंवा कायद्याचे पालन न केल्यामुळे झालेल्या नुकसानीसाठी आम्ही जबाबदार नाही. या अटींमधील कोणतीही गोष्ट ग्राहक संरक्षण कायदा, 2019 अंतर्गत तुमचे हक्क काढून घेत नाही.",
    },
    account:
      "तुमचा पासवर्ड कोणालाही सांगू नका; तुमच्या खात्यातून केलेल्या बुकिंगची जबाबदारी तुमची आहे. तुमची कोणतीही बुकिंग येणे बाकी नसेल, तेव्हा तुम्ही ‘खाते’ पानावर तुमचे खाते हटवू शकता. डिलिव्हरीसाठी असा नंबर आणि पत्ता द्या जो वापरण्याची तुम्हाला परवानगी आहे. आम्ही तुमची माहिती कशी हाताळतो, ते आमच्या <privacy>गोपनीयता धोरणात</privacy> आहे.",
    contact: {
      intro: "बुकिंगबद्दल काहीही असल्यास आधी आम्हाला फोन करा. तक्रारीसाठी आमच्या तक्रार अधिकाऱ्यांना लिहा:",
      promise: "आम्ही 48 तासांच्या आत तक्रार मिळाल्याची पोच देतो आणि एका महिन्याच्या आत ती सोडवतो.",
    },
    law: {
      courts: "या अटी भारताच्या कायद्यांनुसार आहेत. वाद {courts} येथील न्यायालयांत जातील, यामुळे तुमच्या जवळच्या ग्राहक आयोगाकडे जाण्याचा तुमचा हक्क संपत नाही.",
      changes: "आम्ही या अटी अपडेट करू शकतो. वर दिलेले व्हर्जन कोणत्या अटी लागू आहेत ते दाखवते; प्रत्येक बुकिंगला ती ज्या व्हर्जनखाली केली होती तेच व्हर्जन लागू राहते.",
    },
  },
  privacy: {
    meta: {
      title: "गोपनीयता धोरण · Agarwal Stores",
      description: "Agarwal Stores कोणता वैयक्तिक डेटा गोळा करते, का, तो कोण पाहते, तो किती काळ ठेवला जातो, आणि तुमचे हक्क.",
    },
    title: "गोपनीयता धोरण",
    h: {
      who: "आम्ही कोण आहोत",
      collect: "आम्ही काय माहिती गोळा करतो",
      why: "आम्ही ती का वापरतो",
      consent: "तुमची संमती",
      sharing: "ती कोण पाहते",
      device: "कुकीज आणि तुमचे डिव्हाइस",
      keep: "आम्ही ती किती काळ ठेवतो",
      rights: "तुमचे हक्क",
      safety: "ती सुरक्षित ठेवणे",
      children: "लहान मुले",
      changes: "बदल",
    },
    who: "{name}, {address} (“आम्ही”) ही वेबसाइट चालवतो आणि तुमचा वैयक्तिक डेटा कसा वापरला जाईल हे ठरवतो. डिजिटल वैयक्तिक डेटा संरक्षण कायदा, 2023 नुसार आम्ही त्याचे डेटा फिड्युशियरी (Data Fiduciary) आहोत. प्रश्न आणि तक्रारी आमच्या तक्रार अधिकाऱ्यांकडे जातात, त्यांची माहिती <complaints>तक्रारी</complaints> मध्ये दिली आहे.",
    collect: {
      rows: [
        ["तुमचे खाते", "नाव, मोबाईल नंबर, ईमेल, आणि तुमचा पासवर्ड, जो फक्त कोणीही वाचू न शकणाऱ्या वन-वे हॅश (one‑way hash) स्वरूपात ठेवला जातो."],
        ["Google ने साइन इन", "फक्त तुम्ही ते वापरल्यास: Google आमच्याशी शेअर करते ते नाव, ईमेल, प्रोफाइल फोटोची लिंक आणि खात्याचा ID, आणि Google तुमच्या खात्यासाठी देते ते साइन-इन टोकन."],
        ["डिलिव्हरीचे पत्ते", "पत्ता, लँडमार्क, पिनकोड, आणि डिलिव्हरी करणाऱ्यांनी ज्यावर फोन करावा तो मोबाईल नंबर."],
        ["बुकिंग आणि बिले", "वस्तू, किमती, पत्ता, स्टेटस, डिलिव्हरी कोणी केली, घेतलेले रोख किंवा UPI पैसे, बिल, आणि तुम्ही मान्य केलेले आमच्या अटींचे व्हर्जन."],
        ["सुरक्षा नोंदी", "लॉग इन सेशनसाठी आणि वारंवार लॉग इनचे प्रयत्न थांबवण्यासाठी: IP ॲड्रेस आणि ब्राउझरची माहिती."],
      ],
      text: "आम्ही तुमची जन्मतारीख, ओळखपत्रे, कार्ड किंवा बँकेची माहिती, किंवा तुमचे लोकेशन गोळा करत नाही.",
    },
    why: {
      list: [
        "तुमचे खाते तयार करण्यासाठी आणि सुरक्षित ठेवण्यासाठी, तुमचा नंबर किंवा ईमेल तपासण्यासाठीच्या वन-टाइम कोडसह.",
        "बुकिंग पक्की करण्यासाठी तुम्हाला फोन करणे, तिची डिलिव्हरी करणे आणि पैसे घेणे यासाठी.",
        "तुमच्या प्रश्नांना आणि तक्रारींना उत्तर देण्यासाठी.",
        "कर आणि ग्राहक कायद्यानुसार आवश्यक नोंदी ठेवण्यासाठी, आणि फसवणूक व गैरवापर थांबवण्यासाठी.",
      ],
      text: "आम्ही तुमचा डेटा विकत नाही, जाहिरातींसाठी वापरत नाही, आणि तुम्हाला मार्केटिंग मेसेज पाठवत नाही.",
    },
    consent:
      "तुम्ही खाते तयार करता किंवा बुक करता, तेव्हा या पानावर सांगितल्याप्रमाणे आम्ही तुमची माहिती वापरण्यास तुम्ही संमती देता. आम्हाला तुमचे खाते हटवायला सांगून तुम्ही ही संमती कधीही मागे घेऊ शकता. यामुळे आधी झालेले काम उलटत नाही, आणि त्यानंतर आम्ही तुमच्याकडून बुकिंग घेऊ शकणार नाही.",
    sharing: {
      rows: [
        ["आमचा स्टाफ", "दुकानाचा स्टाफ बुकिंग पॅक करण्यासाठी त्या पाहतो. डिलिव्हरी करणारे, ते ज्या बुकिंगची डिलिव्हरी करतात त्यांचे नाव, नंबर, पत्ता आणि वस्तू पाहतात."],
        ["MongoDB Atlas", "आमचा डेटाबेस साठवते, मुंबईत."],
        ["Vercel", "वेबसाइट होस्ट करते, मुंबईत."],
        ["MiniMoth", "WhatsApp किंवा SMS ने वन-टाइम कोड पाठवते: तुमचा मोबाईल नंबर आणि कोड."],
        ["Hostinger", "आमचे ईमेल पाठवते: तुमचा ईमेल पत्ता आणि मेसेज."],
        ["Google", "तुम्ही Google ने लॉग इन केल्यास. आणि डिलिव्हरी करणाऱ्यांचे ‘नकाशा’ बटण तुमचा डिलिव्हरी पत्ता Google Maps मध्ये उघडते."],
        ["ब्रँडच्या वेबसाइट", "उत्पादकांच्या वेबसाइटवरील बहुतेक उत्पादनांची चित्रे Vercel आमच्यासाठी आणते, त्यामुळे त्या वेबसाइटना तुम्ही दिसत नाही. काही चित्रे थेट उत्पादकाच्या वेबसाइटवरून लोड होतात, आणि तेव्हा त्या वेबसाइटला तुमचा IP ॲड्रेस दिसतो."],
        ["शासकीय यंत्रणा", "पोलीस, न्यायालये किंवा सरकारी संस्था, फक्त कायद्याने आवश्यक असेल तेव्हाच."],
      ],
      text: "या सेवा आमच्यासाठी डेटा त्यांच्या स्वतःच्या सुरक्षा अटींनुसार हाताळतात, आणि त्यांपैकी काही, कायद्याने परवानगी दिल्याप्रमाणे, तो भारताबाहेरही प्रोसेस करू शकतात.",
    },
    device:
      "साइट चालण्यासाठी जे आवश्यक आहे तेवढेच आम्ही वापरतो: तुम्हाला 60 दिवसांपर्यंत (किंवा लॉग आउट करेपर्यंत) लॉग इन ठेवणारी एक लॉग इन कुकी, तुम्ही निवडलेली भाषा 1 वर्ष लक्षात ठेवणारी एक भाषा कुकी, Google ने लॉग इन करताना थोड्या वेळासाठीच्या कुकीज, आणि तुमचे कार्ट त्याच्या बुकिंग नंबरसह, जे तुमच्याच ब्राउझरमध्ये ठेवले जाते. इन्स्टॉल केलेले ॲप हीच वेबसाइट आहे आणि यापेक्षा जास्त काही ठेवत नाही. कोणत्याही ॲनालिटिक्स, जाहिरात किंवा ट्रॅकिंग कुकीज नाहीत, म्हणून कुकी बॅनर नाही.",
    keep: [
      "वन-टाइम कोड: 10 मिनिटे.",
      "लॉग इन सेशन: 60 दिवसांपर्यंत, किंवा तुम्ही लॉग आउट करेपर्यंत.",
      "लॉग इन प्रयत्नांच्या नोंदी (IP ॲड्रेससह): साधारण एक दिवस.",
      "तुमचे खाते आणि पत्ते: तुम्ही तुमचे खाते हटवेपर्यंत.",
      "बुकिंग आणि बिले: किमान GST कायद्याने आवश्यक तितका काळ (6 वर्षे). तुम्ही तुमचे खाते हटवता तेव्हा त्यांतून तुमचे नाव, नंबर आणि घर/रस्त्याचा पत्ता काढून टाकला जातो (भागानुसार आमच्या विक्रीसाठी पिनकोड राहतो), पण GST आधी ₹50,000 किंवा त्याहून जास्त रकमेच्या बिलावर नाही, कारण त्यावर खरेदीदाराचे नाव आणि पत्ता दाखवणे आवश्यक आहे.",
    ],
    rights: {
      intro: "तुम्ही कधीही:",
      list: [
        "तुमची माहिती आणि बुकिंग पाहू शकता (‘खाते’ आणि ‘माझ्या ऑर्डर’ पानांवर), किंवा आमच्याकडे काय माहिती आहे आणि ती कोणाकडे गेली याचा सारांश आमच्याकडे मागू शकता;",
        "ती दुरुस्त किंवा अपडेट करू शकता (बहुतेक ‘खाते’ पानावर);",
        "तुमचे खाते आणि तुमचा डेटा स्वतः हटवू शकता, तुमच्या <account>खाते</account> पानाच्या सर्वात खाली, कायद्याने आम्हाला ठेवाव्या लागणाऱ्या नोंदी सोडून;",
        "तुमचा मृत्यू झाल्यास किंवा तुम्ही स्वतः काही करू शकत नसल्यास, तुमच्या वतीने हे हक्क वापरण्यासाठी एखाद्या व्यक्तीला नेमू शकता;",
        "आमच्या तक्रार अधिकाऱ्यांकडे तक्रार करू शकता, आणि नंतर भारतीय डेटा संरक्षण मंडळाकडे (Data Protection Board of India).",
      ],
      how: "<b>कसे मागावे:</b> ‘खाते’ पानावर नसलेल्या कोणत्याही गोष्टीसाठी, तुमच्या खात्यावरील मोबाईल नंबर किंवा ईमेलवरून आमच्या तक्रार अधिकाऱ्यांना फोन करा किंवा लिहा (पहा <complaints>तक्रारी</complaints>), म्हणजे ते तुम्हीच आहात हे आम्हाला कळेल, आणि तुम्हाला काय करून हवे आहे ते सांगा. आम्ही 30 दिवसांच्या आत उत्तर देतो.",
    },
    safety:
      "पासवर्ड फक्त हॅश स्वरूपात ठेवले जातात, साइट फक्त HTTPS वर चालते, आणि स्टाफला फक्त त्यांच्या कामासाठी आवश्यक तेवढेच दिसते. कधी डेटा फुटल्यामुळे (ब्रीच) तुमचा डेटा धोक्यात आला, तर आम्ही कायद्यानुसार तुम्हाला आणि डेटा संरक्षण मंडळाला कळवू.",
    children: "ही वेबसाइट प्रौढांसाठी आहे. आम्ही जाणूनबुजून 18 वर्षांखालील कोणालाही खाते तयार करू किंवा बुक करू देत नाही.",
    changes: "आम्ही हे धोरण बदलल्यास वरची तारीख अपडेट करतो. ते आमच्या <terms>विक्रीच्या अटींसोबत</terms> वाचा.",
  },
};
