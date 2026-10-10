# PROMUNCH: Brand, Product and Operations Research Dossier

Research date: 2026-10-10. Method: server-side page extraction and web search (promunch.in, cdn.shopify.com, Instagram, Amazon, Flipkart and most image CDNs could not be fetched directly from the research environment). Every fact is tagged **VERIFIED** (with a source URL) or **UNCONFIRMED**. "Inferred" means my reasoning from verified evidence. It is not a sourced fact.

---

## 0. TL;DR for the creative tool

- **Exact brand hex codes: NOT FOUND.** The Shopify theme's colour variables live in an inline `<style>` in `theme.liquid`. That is not reachable without raw HTML, and raw HTML could not be obtained (see 1.6 for every URL and method tried). Every colour below is a **colour family taken from image descriptions**, not a hex value. **No hex value in this report comes from the brand.**
- **Fonts: strong lead, not confirmed.** Live product pages contain a leftover "**Tweaks → Typeface**" panel. Its first option is **"Archivo Black + Assistant"**. **Assistant** is also the default font of Shopify's Dawn theme, which the site is built on. This is most likely the heading/body pair in use, but it is UNCONFIRMED. Both fonts are on Google Fonts. I downloaded them (see section 6).
- **Logo:** an uppercase **"PROMUNCH"** wordmark. One version carries the tagline **"YOUR MUNCHY PAL"** in **red text on white** (VERIFIED, from the og:image description). There is also a white version for dark backgrounds and a favicon file named `PM.png` (monogram, UNCONFIRMED). An edamame pack image shows a **crown emblem** ("King of Protein Snacks").
- **Edamame pack colours (from image descriptions):** Himalayan Rock Salt = **blue/white** with a **yellow protein roundel**. Masala Mania = **orange/white**. Indori Chatka = **purple** (likely).
- **Voice:** punchy, irreverent, Gen-Z/millennial English with Indian snack references (namkeen, makhana, chai, tiffin, dadi, mathri) and Hinglish in customer reviews. The signature move is attacking the competition: "Chips could never.", "Makhana who?", "The math is brutal.", "We didn't reinvent namkeen. We just stopped lying about it."
- **Company:** PROMUNCH is a brand of **Vippy Industries Limited (VIL)**, a soya processor in Dewas, MP, founded in 1973. The founder is **Parth Mutha** ("Chief Happiness Officer"; Boston University; the brand LinkedIn page says he made the honorary Forbes Asia 30 Under 30 list, class of 2025).

---

## 1. VISUAL IDENTITY

### 1.1 Token table

| Token | Value | Status | Source / evidence |
|---|---|---|---|
| Primary brand colour | **Unknown hex.** Evidence points to a bright, multi-colour "flavour-coded" system rather than one brand colour. The logo tagline is **red**. | UNCONFIRMED | og:image description: "PROMUNCH logo with the slogan 'YOUR MUNCHY PAL' written below it in red text on a white background" (image `https://promunch.in/cdn/shop/files/Untitled_design_2_82209680-f0d5-4b4f-9b2c-a302b860ebfd.png`, via Tavily search) |
| Logo background | White | UNCONFIRMED (image description) | same as above |
| Inverse logo | White logo for dark backgrounds (`promunch_logo_white_1_…png`, used in the footer) | VERIFIED (file exists) | https://promunch.in/pages/dynamic-qrcode-creator (image list) |
| Edamame: Himalayan Rock Salt pack | Blue + white, yellow circle for "45g protein", green accents. Hero shot on a blue background with pink salt crystals | UNCONFIRMED (image descriptions) | suspire.in HRS_Pack_of_3 image; promunch.in HRS_Image_4.jpg; Amazon 71qJdjuawEL |
| Edamame: Masala Mania pack | Orange + white, hints of green. Hero shot on an orange background with chillies and spice | UNCONFIRMED (image descriptions) | cdn.shopify.com …/Pack_of_3_MM.jpg; Amazon 61aeC+EblqL |
| Edamame: Indori Chatka pack | Purple (the three-pack lineup is described as "purple, blue, orange", leaving purple for IC). One description says "purple, orange and green" | UNCONFIRMED (inferred from image descriptions) | promunch.in AssortedCombo1.png; 0cc3f1da…png; hf_20260603_092955…png ("orange, purple, and teal") |
| Soya Crunchies jars (current "Only the Good Stuff" labels) | Multi-colour labels. Peri-Peri has a **red lid** and a label showing a person on a bicycle. Cheese & Onion has a **blue lid / blue-tinted** pack. Tangy Pudina has a **bright green** label (likely) | UNCONFIRMED (image descriptions) | pushmycart Peri-Peri-270g image; Amazon 71PDZ70waAL (blue lid C&O); Amazon 61s2xVsgeoL (bright green label) |
| Older Soya Crunchies jar ("Your Munchy Pal") | Bright orange label, "50g protein, 17g fibre" | UNCONFIRMED | Amazon image 616gSRCC2VL description |
| Soya chips (Peri Peri) jar | Pink jar | UNCONFIRMED | promunch.in DSL_0480_copy.jpg description |
| Diwali hamper box | Vibrant **pink and purple** with geometric/floral pattern. Label reads "Celebrate the Joy Within". Some descriptions say "festive purple box" | UNCONFIRMED (image descriptions) | Amazon 41DHM5coqEL, 719u40S1n+L |
| Amazon storefront banners | **Yellow** backgrounds ("Munch Happily, Stay Fit!") | UNCONFIRMED (image alt text) | https://www.amazon.in/stores/ProMunch/page/B9E7339C-E4CD-4A3F-92F9-A52196744462 |
| Background / text / button colours (site) | **Unknown.** They are defined in an inline theme style that could not be reached | NOT FOUND | see 1.6 |
| Heading font | **Archivo Black** (Google Font, single weight 400) | UNCONFIRMED (strong lead) | "Tweaks / Typeface" panel on product pages lists "Aa Archivo Black + Assistant" first: https://promunch.in/products/promunch-roasted-edamame-beans-masala-mania-42g-high-protein-snack-pack-of-3 |
| Body font | **Assistant** (Google Font, variable 200–800). It is also Dawn's default `--font-body-family` / `--font-heading-family` | UNCONFIRMED (strong lead) | same panel; the theme is Dawn-derived (global.js below) |
| Other typeface options in the same panel | Sora + Inter; Poppins + Work Sans; Fraunces + Manrope; Jost + DM Sans; Playfair Display + Poppins; Anton + Work Sans | VERIFIED (panel text exists); none is confirmed active | same URL |
| Display style | Headlines often use an *italic emphasis on the second phrase* (markdown shows `Crunch *happens here.*`, `Refuel *the gains.*`, `Quick *answers.*`, `Your 4pm *just got better.*`, `Built for *every* kind of hunger.`). Eyebrow labels are prefixed with "★". Marquee separator is "✦" | VERIFIED (text structure) | https://promunch.in/ and product pages |
| Favicon | `https://promunch.in/cdn/shop/files/PM.png?crop=center&height=32&v=1784261483&width=32` (file name suggests a "PM" monogram) | URL VERIFIED; design UNCONFIRMED | Tavily favicon field for https://promunch.in |
| Main logo | `https://promunch.in/cdn/shop/files/promuch.png?v=1784261565&width=2400` (header logo, alt="PROMUNCH") | VERIFIED | header image on every page |
| White logo | `https://promunch.in/cdn/shop/files/promunch_logo_white_1_0aa6f2ce-fa08-4628-9dec-6943248d6de6.png?v=1783944417&width=760` | VERIFIED | footer image |
| Social / OG image (logo + tagline) | `https://promunch.in/cdn/shop/files/Untitled_design_2_82209680-f0d5-4b4f-9b2c-a302b860ebfd.png?v=1782722831` | VERIFIED | og:image of the homepage and collections |
| Footer icons | `material-symbols_mail-outline_2.svg`, `location_1_2.svg`, `telephone-call_1_2.svg`, `Payment_Gatewatys.svg` | VERIFIED (URLs); fetch failed | footer |

### 1.2 Logo description (best evidence)
- An uppercase **PROMUNCH** wordmark. The site uses the all-caps brand name everywhere: VERIFIED in the meta.json `"name":"PROMUNCH"` and all page titles.
- The tagline lock-up is **"YOUR MUNCHY PAL"** in red on white (UNCONFIRMED, from an image description). The YouTube handle is `@PromunchYourMunchyPal` (VERIFIED). The homepage eyebrow says "★ Your munchy pal" (VERIFIED).
- Edamame packs carry a **crown emblem** tied to the "King of Protein Snacks" positioning (UNCONFIRMED image description: Amazon 71CJMVGVbmL "with a crown emblem … 'King of Protein Snacks'"). The "King of Protein Snacks" phrase itself is VERIFIED in product copy and on the founder's LinkedIn.
- The colour of the wordmark letters is **not established**. No description states it. The red-tagline description suggests a red/dark wordmark on white, but that is UNCONFIRMED.
- Next step: open `promuch.png` and `PM.png` in a normal browser and sample hex values with an eyedropper. I could not do this here because every image host is blocked.

### 1.3 Theme / tech facts (relevant for matching the site look)
- Shopify store `PROMUNCH`, id 79467315501, myshopify `a1e4f4-2.myshopify.com`, city Dewas, MP. Files CDN path `cdn.shopify.com/s/files/1/0794/6731/5501/`. VERIFIED: https://promunch.in/meta.json
- The theme is **Dawn-derived**: `global.js` is Dawn code plus a custom nav-highlight script (`#navLinks`, `#navHl`). VERIFIED: https://promunch.in/cdn/shop/t/12/assets/global.js and t/20, t/21, t/22. `global.js` exists for theme ids **4, 12, 13, 15, 20, 21, 22**. Only t/20, t/21, t/22 (and t/12) contain the custom nav-highlight script; t/4, t/13 and t/15 are plain Dawn. ids 9–11, 14, 16–19 and 23–28 return 404. The **live theme id was not determined**; the highest existing id is 22. Template section id seen: `template--27854375649581__main`.
- Dawn CSS files that were fetched (`section-footer.css`, `component-price.css`, `section-image-banner.css`) use only CSS variables such as `rgb(var(--color-foreground))` and `--font-heading-scale`. They contain no brand hex values.
- Footer credit: "powered by Shopify Experts" linking to https://www.controlf5.in/shopify-experts/ (ControlF5, the agency). VERIFIED.
- Apps and services: Judge.me reviews (VERIFIED), Shiprocket order tracking at https://promunch.shiprocket.co/ (VERIFIED), Klaviyo, Google Analytics, GTM, jQuery, Slick, Lightbox (VERIFIED via urlscan.io scan 01a0d20f-8c48-7130-afdd-e37a88ceeb87 "Detected technologies"). Shop Pay and Google Pay (VERIFIED: https://promunch.in/.well-known/ucp).
- The homepage is custom-coded and interactive: a nutrient comparison ("Tap a nutrient — watch them lose"), a drag-to-compare slider, a mini game ("The protein dash: Catch the good stuff. ＋Promunch & greens ✕Chips & junk … Move with mouse / ← →") and an occasion accordion.
- There is also a separate `admin.promunch.in` titled "PROMUNCH CRM" behind Cloudflare, created in about September 2026. VERIFIED: urlscan search result.

### 1.4 Photography and visual style (from image descriptions and file names)
- **Flat-lay / props product photography** with the pack plus a bowl of product, scattered beans, chillies, lemon, pink salt, cinnamon, garlic, potted plants, wooden boards, tiled counters (UNCONFIRMED descriptions of `ICImage1.jpg`, `Copy_of_hf_…`, Amazon images).
- **Lifestyle scenes**: a picnic on a yellow-checked tablecloth with watermelon, oranges, ice water and sunglasses (`Assorted_5…png`); a desk scene "Professional enjoying PROMUNCH … at work" (`HRs_Image_5.jpg`); a soya-sticks bowl on grass with a Nikon camera and soda (`DSL_0466_copy.jpg`); a turntable with a vintage pattern (`hf_20260603_092955…png`); a Diwali scene with marigolds, a diya and "Happy Diwali" notes.
- **Bold solid-colour backgrounds matched to the flavour colour** (blue for HRS, orange for MM, multi-colour behind the trio).
- **Comparison graphics**: `MM_Comparison_PM_1.jpg`, `rock_salt_comparison_1.jpg`, `cmp-makhana.jpg`, `cmp-peanuts.jpg`, `food-chips.png`, and a "Regular namkeen 2g protein 170 kcal vs PROMUNCH 14g protein 100 kcal" drag slider.
- **The asset file names show an AI-heavy content pipeline** (VERIFIED file names; workflow inferred): `ChatGPTImageJun16_2026_…png`, `magnific_use-the-uploaded-promunch_…png` / `magnific_use-uploaded-promunch-pou_…png` (Magnific), `hf_20260603_…png` (likely Higgsfield), `simple-ads-1784965193678-5zpvb.jpg`, `Untitled_design_2…png` / `Copy_of_…` (Canva naming). Real DSLR shoots are also in use (`DSL_0466_copy.jpg`, `DSL_0591_copy.jpg`).

### 1.5 What would settle hex/fonts definitively
- Open https://promunch.in in a browser, then DevTools, then look at `:root` in `<head>` for `--color-base-*` / `color-scheme-*` and `--font-heading-family` / `--font-body-family`, and the `@font-face` sources.
- Or ask the brand for the Shopify theme export: `config/settings_data.json` has `colors_*`, `type_header_font` and `type_body_font`.

### 1.6 Every URL and method tried for theme colours and fonts
| Attempt | Result |
|---|---|
| curl https://promunch.in/ , https://r.jina.ai/https://promunch.in , https://web.archive.org/web/2026/https://promunch.in/ , promunch.myshopify.com/products.json | 403 CONNECT (blocked) |
| tavily_extract https://promunch.in (advanced, include_images) | Text only, images list empty, favicon found |
| tavily_extract `/cdn/shop/t/{1..28}/assets/base.css` | t/{4,12,13,15,20,21,22} "Failed to fetch" (they exist, but Tavily cannot return them); others 404 |
| tavily_extract t/12 and t/22 `component-card.css`, `component-cart-drawer.css`, `base.css?v=1` | Failed to fetch |
| tavily_extract t/12 `section-footer.css`, `component-price.css`, `section-image-banner.css`, `global.js`, `global.js.map` | Fetched. They contain only CSS variables, no brand values |
| tavily_extract t/22 `custom.css`, `promunch.css`, `custom-styles.css`, `home.css`, t/4 `theme.css` | 404 |
| tavily_extract cdn.shopify.com/s/files/1/0794/6731/5501/t/22/assets/base.css and footer SVGs | Failed to fetch |
| tavily_extract `/?sections=header,footer,…` (Section Rendering API) | Tags stripped to text, no styles |
| tavily_extract web.archive.org `id_` snapshot, CDX API, wildcard URL list | Text only / failed / JS-only page |
| PageSpeed Insights API (curl and Tavily) | 429, anonymous quota is 0 |
| urlscan.io search (OK) → result API / DOM for scan 01a0d20f… | Failed to fetch / JS-only |
| brandfetch.com/promunch.in, api.allorigins.win, api.codetabs.com, r.jina.ai via Tavily | Failed / timed out |
| curl to yt3.googleusercontent.com, m.media-amazon.com, rukminim2.flixcart.com, i.ytimg.com, media.licdn.com, review-images.judgeme.com | 403 (blocked), so images could not be downloaded for colour sampling |

---

## 2. BRAND LANGUAGE

### 2.1 Homepage copy, verbatim (https://promunch.in/, VERIFIED)
- Page title: "Roasted Edamame Beans – India's Best High Protein Snack – PROMUNCH". An older title, seen in the Wayback snapshot, was "PROMUNCH : High Protein & Vegan Healthy Snacks | Guilt-Free Munching".
- Hero: "In olive oil." / "0 palm oil" / "42g protein" / "★ Masala Mania" / H1 **"Chips could never."** / CTA "Shop the lineup" / "SCROLL ↓"
- Marquee: "BYE BYE PROTEIN BARS ✦ MAKHANA WHO? ✦ BAKED NOT FRIED ✦ NO PALM OIL ✦ NO MAIDA ✦ CHIPS COULD NEVER ✦"
- "★ Why do people even eat makhana?" / H2 **"The math is brutal."** / "Per 100g, against the snacks you'd usually reach for. Tap a nutrient — watch them lose." Cards compare PROMUNCH Edamame, Makhana, Chips and Peanuts (values in section 3). Footnote: "*Per 100g. Values are typical and subject to natural variation."
- "★ Three ways to win 4pm" / H2 **"Pick your crunch."** / "01 · Best seller — Edamame — Shop →", "02 — Soya Crunchies — Shop →", "03 — The Rest of Snacks — Shop →"
- "★ No bad time to crunch" / H2 **"Crunch *happens here.*"** Occasion cards (title, headline, body, "How to munch" tip):
  - Post-workout: "Refuel *the gains.*" "Roasted edamame, never fried. 42g protein per 100g doing real recovery work." Tip: "A handful within 20 min of your last set." ("Tap for more →")
  - 3pm slump: "Desk fuel, *zero crash.*" "Crunchy, salty edamame to beat the dip — no sugar spike, no oily keyboard." Tip: "Stash a pack in your desk drawer."
  - Movie night: "Couch *companion.*" "Edamame with the same handful pull as popcorn, way more protein." Tip: "Tip the whole pack into a bowl before you press play."
  - Chai time: "The new *namkeen.*" "The crunchy edamame your cutting chai always deserved." Tip: "Swap the mathri for a handful of edamame."
  - On the move: "Bag it *& bounce.*" "Edamame that survives a backpack — no mess, no oil, no crumbs." Tip: "Keep a 100g pack in your bag at all times."
  - On a salad: "Toss on *a salad.*" "Swap sad croutons for crunchy edamame — more bite, more protein." Tip: "Scatter on right before serving so it stays crisp."
  - Tiffin box: "Lunchbox *MVP.*" "Edamame that isn't fried and won't get traded away at lunch." Tip: "Pair with a fruit box for protein + fibre."
  - Between meetings: "Mind *the gap.*" "Edamame for the bored five minutes between calls — no chips-bag guilt." Tip: "Portion a small bowl so a few doesn't become the pack."
- Game: "★ Play for a perk" / "Hit your macros." / "PROTEIN 120g/120g · CALORIES /1800 · TIME 45s" / "★ The protein dash" / "Catch the good stuff." / "＋Promunch & greens" / "✕Chips & junk" / "120g protein · under 1800 cal" / "Move with mouse / ← →"
- Feature blocks: **"Hits harder than your shake."** "45g of plant protein per 100g, roasted not fried. Tastes like a snack, works like a supplement." / **"Quietly retiring your snack drawer."** "Low calories, high fibre, slow-burn energy. Keep one at your desk - your 3pm self will thank you."
- UGC: "## Tag #promunch", followed by seven tiles credited to "@arjunfits".
- Newsletter: "★ Your munchy pal" / "★ Join the munchers" / **"Get ₹50 off your first box."** / "Drops, restocks, and snack-worthy emails. No spam, no apologies."
- Homepage FAQ (5 questions): What is edamame? / Is PROMUNCH suitable for vegans? / How much protein does PROMUNCH edamame contain? ("up to 40–45g of protein per 100g") / Is roasted edamame good for weight loss? / How is roasted edamame different from regular (fresh/frozen) edamame?

### 2.2 Global UI microcopy (VERIFIED, all pages)
- Cart-drawer offer banner: "🏷️ **Get 10% OFF** on orders above ₹399; use code **PROMUNCH10**" / "🏷️ **Get 15% OFF** on orders above ₹499; use code **PROTEIN15**"
- "Your cart is empty / Continue shopping / Have an account? Log in to check out faster. / Tax included. Shipping calculated at checkout. / Check out"
- Main nav: HOME · Gift Hamper · Roasted Edamame Beans · PRODUCTS · Blogs
- Footer brand line: "At PROMUNCH, we are on a mission to revolutionise the snacking industry by offering guilt-free and protein-packed snacks that nourish your body and delight your taste buds."
- Footer "Quick links": Home, About Us, Products, Blogs, Track Order, Combo, Community, Customer Reviews, PROMUNCH at HYROX. "Help": Contact Us, FAQ's, Shipping Policy, Refunds & Return Policy, Privacy Policy, Terms of Service, CPCB CERTIFICATE. "Get in Touch": email, address, phones. Social: Facebook, Instagram, "Snapchat" (actually links to the LinkedIn showcase page), YouTube. "© 2026, PROMUNCH powered by Shopify Experts".
- Collection card button: "ADD"; discount badge "5% OFF"; product badges "Sale".

### 2.3 Product-page template copy (VERIFIED: every product page uses the same custom template, e.g. https://promunch.in/products/promunch-roasted-edamame-beans-masala-mania-42g-high-protein-snack-pack-of-3)
- Category eyebrow: "SNACKS · PROTEIN NAMKEEN · ASSORTED"
- "★ Choose your flavour" (edamame) / "Flavour Name" (soya)
- "Delivery by **Thu, 15 Oct**" / "Add to cart" / "Buy it now"
- Trust line: **"1M+ Happy Snackers | Trusted by Leading Hotels, Corporates, Workplaces"**
- Marquee: "14G PROTEIN ✦ NO PALM OIL ✦ NO MAIDA ✦ 100 KCAL ✦ BAKED NOT FRIED ✦ INDIA'S 1ST PROTEIN NAMKEEN ✦"
- "★ Why do people even eat makhana?" / **"Stop killing your cravings."** / "For thirty years namkeen meant palm oil, maida and a 6pm sugar crash. We rebuilt it from scratch."
- "★ The whole point": 42.9g Protein / 100g ("More protein than peanuts, makhana, or a protein bar — the highest in its class, baked never fried."), 431 Calories ("Light for a full 100g"), 26.75g Carbs ("slow-burn energy"), 12.83g Fibre ("genuinely high fibre"), 16.32g FAT ("no palm oil, good fats")
- "★ WHY PROMUNCH" / **"Stop killing your cravings. Start feeding them."** / "For thirty years, namkeen has been quietly betraying you - palm oil, maida, sugar dressed up as crunch. We rebuilt it from scratch with the protein your dadi wishes you'd eat and the flavor she'd actually approve of." / 42g Protein/100g · 431 calories · 26g carbs · 12g fibre
- "The math is brutal." (same four-way comparison; the chips card is labelled "Potato Chips" here)
- Drag slider: "'Regular' namkeen — 2g PROTEIN, 170 KCAL" vs "PROMUNCH — 14g PROTEIN, 100 KCAL" / "← DRAG TO COMPARE  MORE OF NOTHING →"
- **"Built for *every* kind of hunger."** — "3pm at the desk: When you need crunch but a third coffee will end you." / "Post‑gym: More protein than your shake. Tastes like food, not chalk." / "11pm. Couch. Netflix.: Eat the whole pack. We literally don't care."
- Pull quote: **"We didn't reinvent namkeen. We just stopped lying about it."**
- "## *Pick Your Flavor*" (recommendations)
- "### Quick *answers.*" FAQ: What makes PROMUNCH a high-protein snack? / How much protein is in PROMUNCH? ("up to 45g of protein per 100g … one of India's highest-protein roasted snacks") / What is Edamame? / Is roasted edamame good for weight loss? / Is it vegetarian? ("100% vegetarian snack made only from edamame beans") / Is it fried? ("roasted in olive oil, not deep fried") / Where can I buy PROMUNCH? ("directly from our website or through leading online marketplaces across India")
- Sticky CTA: "★ ONE LAST THING" / **"Your 4pm *just got better.*"** / "Add to cart · Rs. 570.00  SAVE 5%" / **"FREE SHIPPING · 15-DAY RETURNS · CANCEL ANYTIME"**. This conflicts with the written policies, which say non-returnable food, a 12-hour cancellation window and weight-based shipping (see section 4).
- Note: this template copy is edamame-specific (42.9g protein, "made only from edamame beans"), yet it also renders on soya crunchies, hamper and Vama pages. That is a content inconsistency on the live site.

### 2.4 Other pages (VERIFIED)
- **About** (https://promunch.in/pages/about-us): "Our **Mission**" — "…revolutionize the snacking industry by offering guilt-free and protein-enriched snacks…" / "Our mission is to become India's most trusted and preferred brand for healthy snacking…" / "Our Values": Nutrition and Innovation; Quality and Purity ("vegan, gluten-free, and non-GMO"); Customer Satisfaction; Sustainability / "We are a team of enthusiastic foodies" / "Experience the joy of snacking with PROMUNCH - the perfect blend of taste, nutrition, and the sheer joy of good food!" / "ALSO AVAILABLE ON" (a 5-slide marketplace logo carousel). This is older, formal copy that still talks about "roasted soya snack".
- **Contact** (https://promunch.in/pages/contact): "GET IN TOUCH — We would love to hear from you! … we will respond within 48 hours." / "+91 81095 88699" / "hello@promunch.in" / "We are available Monday to Saturday; 10 am - 6:30 pm." / "Should you wish to send us a postcard, here's our address: Vippy Industries Limited 28, AB Rd, Industrial Area No. 1, Dewas, Madhya Pradesh 455001" / "Contact form" / "Call Us: +917272258545 / 8109588699".
- **FAQ** (https://promunch.in/pages/faqs): 10 questions: what is edamame; vegan; gluten ("Edamame is naturally gluten-free … made without maida … Always check the current packaging for full allergen details."); protein 40–45g/100g; weight loss/fitness; flavours (HRS, Indori Chatka, Masala Mania, assorted combo); children; topping use; roasted vs fresh/frozen; additives ("roasted in olive oil with no palm oil, no maida, and no artificial preservatives").
- **Community** (`/pages/community`): only the heading "Our Community" (the content is probably an embedded widget). **HYROX** (`/pages/promunch-hyrox-mumbai`): title "PROMUNCH at HYROX Mumbai | High-Protein Fuel", H1 "PROMUNCH | HYROX MUMBAI", body not captured. **CPCB** (`/pages/cpcb`): "CPCB REGISTRATION CERTIFICATE" (an image, which points to plastic-packaging EPR compliance). **All reviews**: "Read genuine customer reviews … Discover why thousands of customers trust PROMUNCH…". **Combo** (`/pages/combo`): title "Protein-Enriched Combo Snack Packs | Gluten-Free & Vegetarian Options".
- **Dynamic QR code page** (`/pages/dynamic-qrcode-creator`): "QR code library for PROMUNCH." / "Processing QR Code...." plus boilerplate SEO text ("PROMUNCH is a protein-enriched, guilt-free snack brand that is made in India… has a QR code on its packaging that directs customers to a website…") with a link to qrcodegeneratorhub.com. This is an app-generated page and suggests QR codes on packs.
- **Collection headings**: "EDAMAME BEANS", "SOYA CRUNCHIES", "REST OF THE SNACKS", "Combos and GIft Packs" (typo is on the site), "Roasted Edamame Beans — High Protein, Low Calorie Snacks".

### 2.5 Tone of voice
- **Challenger / anti-incumbent.** It names and mocks the alternatives: chips, makhana, peanuts, protein bars, shakes, "regular namkeen". Examples: "Chips could never.", "Makhana who?", "Bye bye protein bars", "Hits harder than your shake.", "Tastes like food, not chalk.", "watch them lose".
- **Numbers as punchlines.** 42g / 45g / 42.9g protein, 0 palm oil, 14g/100 kcal, "The math is brutal.", "Hit your macros."
- **Short, declarative, deadpan.** Full stops on fragments: "In olive oil.", "Lunchbox MVP.", "Mind the gap." It is cheeky and self-aware: "Eat the whole pack. We literally don't care.", "No spam, no apologies.", "your 3pm self will thank you".
- **Desi everyday context written in English.** Namkeen, makhana, cutting chai, mathri, tiffin, dadi, 4pm/3pm/11pm rituals, Netflix, office desk, gym bag. Hindi words are used as nouns inside English sentences. Full Hinglish sentences appear mainly in **customer reviews** ("Namkeen ki jagah ab Promunch, taste bhi acha aur healthy bhi"). Flavour names are Hindi/Indian: Indori Chatka, Chatpata Masala, Tangy Pudina.
- **Recurring structural devices**: the "★" eyebrow, then a two-part headline with an italic second half, then a one-line body, then a practical tip; "✦"-separated marquee claims; time-of-day hooks.
- **Two registers coexist.** The 2026 edgy edamame voice sits on the homepage and product template. The older, formal, SEO-heavy copy ("PROTEIN-PACKED:", "VEGETARIAN DELIGHT:", "NUTRIENT-RICH GOODNESS") sits in soya product descriptions, About and marketplace bullets. Gifting copy is warm and festive ("share the joy", "Celebrate the Joy Within").
- **Recurring phrases list**: "Chips could never", "The math is brutal", "Pick your crunch", "Crunch happens here", "Hits harder than your shake", "Your munchy pal" / "YOUR MUNCHY PAL", "Join the munchers", "King of Protein Snacks", "India's 1st protein namkeen", "Baked not fried" / "Roasted not fried" / "never fried", "No palm oil · No maida", "Roasted in olive oil", "Only the Good Stuff" (soya jar label), "Munch Happily, Stay Fit!" (Amazon), "Your 4pm just got better", "Stop killing your cravings. Start feeding them.", "guilt-free", "snack drawer", hashtags #promunch #KingOfProteinSnacks #UnboxTheCrunch #crunchbetter.

---

## 3. PRODUCTS

Source for names, prices, SKUs, weights and created dates: https://promunch.in/products.json (24 products; VERIFIED) and the product pages. "Price" is the selling price and "Compare-at" is the struck-through MRP on the site. Several compare-at values are **lower** than the price, which is a site data error (flagged).

### 3.1 Roasted Edamame Beans (launched June 2026; "Best seller")
Claims (VERIFIED on product pages): 42g (MM, IC) / 45g (HRS) "complete plant protein per 100g", "all 9 essential amino acids", roasted in olive oil (not fried), zero palm oil, zero preservatives, no maida, no MSG, no artificial flavours/colours, no added sugar (in product handles and Amazon titles), high fibre, low-GI, "ideal for PCOS/PCOD management", 100% veg/vegan, gluten-free ("naturally"), resealable zipper pack, no refrigeration needed. Amazon ingredient field: "Edamame Beans" (VERIFIED, https://www.amazon.in/PROMUNCH-Roasted-Edamame-Himalayan-Munching/dp/B0H4RKV6LW). The full ingredient and allergen panel is UNCONFIRMED.

Flavour descriptors (VERIFIED, blog/product): **Himalayan Rock Salt** "Pure & Naturally Crunchy" / "simple, lightly seasoned"; **Masala Mania** "Bold & Spicy Protein Snack"; **Indori Chatka** "Tangy & Irresistibly Crunchy", "inspired by popular Indore-style flavours".

| Product (site title) | Pack | Price ₹ | Compare-at ₹ | SKU |
|---|---|---|---|---|
| Masala Mania Roasted Edamame Snacks | pack of 3 × 100g | 570 | 600 | PM-EDM-MAS-42G-3PK |
| Indori Chatka Roasted Edamame Snacks \| PROMUNCH | pack of 3 × 100g | 570 | 600 | PM-EDM-IND-42G-3PK |
| Himalayan Rock Salt Roasted Edamame Snacks \| PROMUNCH | pack of 3 × 100g | 570 | 600 | PM-EDM-HRS-P3 |
| PROMUNCH Roasted Edamame Beans Combo (1 of each flavour) | 3 × 100g | 570 | 600 | Combo100g-3 |
| Roasted Edamame Beans \| Masala Mania \| Pack of 2 | 2 × 100g | 400 | – | (reuses PRM-EDA-MINI-COMBO-25G) |
| Roasted Edamame Beans Indori Chatka \| Pack of 2 | 2 × 100g | 400 | – | PM-EDM-IND-42G-3PK-1 |
| Himalayan Rock Salt Pack of 2 | 2 × 100g | 400 | – | PM-EDM-HRS-P3 |
| Edamame Beans Travel Combo – Pack of 9 (3 per flavour) | 9 × 25g | 450 | – | PRM-EDA-MINI-COMBO-25G |

The pack-of-2 products carry product_type "Rakshabandhan Gift".
Marketplace prices: Amazon single 100g pouch ₹189 per flavour; Variety Pack (3) ₹565; IC Pack of 3 ₹599 (VERIFIED, Amazon B0H4RGZJF6 / B0DKJNZHC3). Hyugalife: 100g ₹195, MRP ₹200 (VERIFIED, https://hyugalife.com/brands/promunch). Single 100g MRP is therefore ₹200 (inferred).

**Edamame nutrition** (VERIFIED on site; note the internal inconsistencies):
- "The whole point" block, per 100g: Protein 42.9g, Energy 431 kcal, Carbs 26.75g, Fibre 12.83g, Fat 16.32g.
- Comparison card, per 100g: Protein 42.9g, Fibre 12.3g, 428 kcal, Fat 15.86g.
- Comparison values for the alternatives, per 100g: Makhana 7.8g protein / 11.8g fibre / 480 kcal / 18.5g fat. Chips 7.2 / 5.2 / 537 / 33.1. Peanuts 23.1 / 5.38 / 558 / 40.26.
- HRS is claimed at 45g/100g. FB/marketing copy says "40–45g protein and 12g+ fibre per 100g".
- **Per-serving**: the marquee "14G PROTEIN … 100 KCAL" and slider "PROMUNCH 14g PROTEIN 100 KCAL" do not match the edamame per-100g figures (14g protein would be about a 33g serving, which is about 142 kcal). The YouTube short "Soya Crunchies Peri-Peri 14g Protein … 14g protein and 5g fibre per serving" suggests the 14g figure comes from soya crunchies (inferred). Treat edamame per-serving values as **UNCONFIRMED**.
- A founder post says "Fresh edamame ~10g protein per 100g. Roast it, remove the water … 42–45g" (VERIFIED, https://in.linkedin.com/in/parth-promunch). An Instagram reel says "up to 11g protein" per pack (UNCONFIRMED serving basis).

### 3.2 Soya Crunchies (roasted soya "protein namkeen", the original product from about 2021)
Flavours: **Noodle Masala, Tangy Pudina, Peri Peri, Cheese & Onion** (VERIFIED). Claims: "48% protein content", gluten-free, vegetarian/vegan, non-GMO, "no artificial flavors or preservatives", roasted not fried. Amazon titles say "48g Protein and 18g Fibre per 100g" (VERIFIED in Amazon alt text). The older label said "50g protein, 17g fibre" (UNCONFIRMED image description). Some resellers list 22–23g protein/100g (desertcart; likely wrong, UNCONFIRMED). Shelf life: **4 months** on most listings, **6 months** on the C&O/PP/NM variety pack (VERIFIED, products.json bodies). Amazon ingredient field: "Soya" (VERIFIED). Jar formats: 150g, 270g (earlier 300g), and 30g pouches.

| Product | Pack | Price ₹ | Compare-at ₹ | SKU |
|---|---|---|---|---|
| Noodle Masala Soya Crunchies – 270gm (page also shows a "Flavour Name" switcher for C&O, Peri-Peri, Tangy Pudina) | 270g jar | 260 | – | U0-AV9X-28V0 |
| Variety Pack Protein Snacks (Cheese & Onion, Peri Peri, Noodle Masala) | 3 × 150g | 450 | – | PROCOMBO-3 |
| Variety Pack Protein Crunchies (Noodle Masala, Tangy Pudina, Peri Peri) | 3 × 150g | 450 | – | TPMFN6FBA-3 |
| Variety Pack Protein Crunchies (Noodle Masala, Tangy Pudina, Cheese & Onion) | 3 × 150g | 450 | – | TPMFN7FBA-3 |
| Assorted Flavored Pack – 150gm × 4 (all 4) | 4 × 150g | 570 | 600 | TPMFN5FBA-3 |
| Assorted Flavored Pack – 270gm × 4 | 4 × 270g | 1040 | 920 (error) | 4COMBO300G |
| Travel Combo Pack – Pack of 12 × 30g (all 4 flavours) | 12 × 30g | 360 | 324 (error) | 30gCombo-P3Pouch-All 4 |

Amazon also lists 9 × 30g pouches (TP/PP/NM). Hyugalife lists 270g at ₹230 (MRP ₹250) and 2 × 150g at ₹270 (MRP ₹300) (VERIFIED).

### 3.3 "The Rest of Snacks": Soya Sticks and Soya Chips
- Soya Sticks: **Chatpata Masala**, **Cream & Onion**. Soya Chips: **Peri Peri**. Claims: "No palm oil, no maida", "Perfectly baked", high protein, no artificial preservatives (VERIFIED). Jar labels read "NO MAIDA - NO PALM OIL" (UNCONFIRMED image description).

| Product | Pack | Price ₹ | Compare-at ₹ | Avail |
|---|---|---|---|---|
| Soya Sticks – Chatpata Masala (100g × 2) | 2 × 100g | 300 | 270 (error) | yes |
| Combo – Soya Sticks Chatpata Masala + Cream Onion | 2 × 100g | 300 | 270 (error) | yes |
| Combo – Soya Sticks (CM, CO) + Soya Chips Peri Peri | 3 × 100g | 450 | 405 (error) | yes |
| Big Bite Munch Combo (3 × 100g sticks/chips + 4 × 150g crunchies) | 7 packs | 1050 | 963 (error) | yes |
| The Ultimate Munch Combo – 30gm × 7 | 7 × 30g | 207 | 191 (error) | **sold out** |

Blinkit lists "Crunchy Soya Sticks (No Palm Oil) 65 g", "Protein Soya Beans & Edamame 175 g" and "Edamame Crunchy Seeds 500" under the brand promunch (VERIFIED as a search snippet from https://blinkit.com/brand/promunch; page fetch failed).

### 3.4 Gifting
| Product | Contents | Price ₹ | Compare-at ₹ | Notes |
|---|---|---|---|---|
| **Corporate Diwali Gift Hampers – Healthy & Delicious Gifting** (created 2026-09-25, vendor "PROMUNCH-DIWALI!") | Edamame packs (flavours), Soya Chips, **Beetroot Chips**, festive gift box, greeting card | 999 | 1199 | SKU PROM-DH-500G, 500g. Audience: "Corporate employees, Clients and customers, Business partners, Office teams, Dealers and distributors". "For corporate orders and bulk gifting enquiries, contact the PROMUNCH team". The site shows "SAVE 16%" |
| **PROMUNCH Diwali Snack Box \| Festive Gifts for Celebrations** | Edamame, soya sticks & chips, beetroot chips | 555 | 699 | SKU PM-GHMP-ASST-01, 380g. The old Rakhi hamper URL `/products/🎁-promunch-rakhi-hamper-healthy-gifting-with-love` now resolves to this product (VERIFIED). "SAVE 20%" |
| Swageazy B2B listing "Promunch Diwali Premium Gift Box" | Edamame in 3 flavours + soya chips + beetroot chips | from ₹1140, MOQ 50 | – | Shelf life 6 months (VERIFIED, https://swageazy.com/products/9491/promunch-diwali-premium-gift-box) |
| Amazon "PROMUNCH Diwali Gift Hamper" | 3 edamame packs, Soya Peri Peri chips, Beetroot Cheese chips (one variant mentions Jalapeño), greeting card | – | – | Pink/purple box, "Celebrate the Joy Within" (Amazon B0FN77ST8H) |
| pushmycart (export, USD) | "Diwali Moments: Premium Gift Hamper" 390g; "The Ultimate Diwali Gift Hamper" 900g | $29.70 | – | VERIFIED listing |

Beetroot chips appear **only inside hampers** (VERIFIED in descriptions). They are not a standalone SKU on the site.

### 3.5 Vama soya items sold on promunch.in
| Product | Pack | Price ₹ | Compare-at ₹ | Claims |
|---|---|---|---|---|
| Soya Mini Chunks Dual Pack | 2 × 250g | 440 | – | "52% Protein 99% Fat-free", made from 100% soy flour, shelf life 6 months |
| Soya Flour Dual Pack | 2 × 500g | 440 | 398 (error) | "50% Protein and 98% Fat-free", shelf life 6 months |

Relationship: the handles are `vama-soya-mini-chunks-…` and `vama-soya-flour-…`, the SKUs are `VAMASMC002` / `VAMASF002`, and the vendor field is "PROMUNCH". **Vama is Vippy Industries' own consumer soya brand**: "Vama Soya Chunks offered by Vippy Industries Limited, Dewas" (VERIFIED, https://www.indiamart.com/vippyindustrieslimited-20930631/soya-chunks.html). Facebook page: facebook.com/vamahealthyproducts. On promunch.in they are cross-sold sister products, re-described as "Promunch Soya Chunks".

### 3.6 Certifications / compliance
- FSSAI licence number: **NOT FOUND** publicly (UNCONFIRMED). Packer on Amazon: "VIPPY INDUSTRIES LTD. 28, Industrial Area, A.B. Road Dewas (M.P.) India" (VERIFIED).
- CPCB registration certificate page exists (VERIFIED; the content is an image).
- The old homepage (Wayback) said "Our Products Are Certified By" followed by five logos (images not readable). Vippy holds ISO certifications (VERIFIED, LinkedIn company page), but PROMUNCH-specific certifications are UNCONFIRMED.
- The site carries an "Amazon's Choice" badge history (VERIFIED, Global Indian 2024).
- Ratings: Judge.me store widget 4.5 (36) (VERIFIED); schema aggregateRating 5.0 (25) on product pages (VERIFIED as markup).

---

## 4. OPERATIONS / BUSINESS

### 4.1 Entity, people, location
- **Legal entity: Vippy Industries Limited (VIL)**. "This website is operated by Vippy Industries Limited (VIL)." VERIFIED: https://promunch.in/policies/terms-of-service. CIN U15142MP1973PLC001225, incorporated 29 Sep 1973, registered office 28, Industrial Area, A.B. Road, Dewas, MP 455001. Revenue above ₹1,000 Cr in FY25. About 181 employees. VERIFIED: https://tracxn.com/d/legal-entities/india/vippy-industries-limited/… . A non-GMO soya processor and exporter (to 51 countries), with a 20-acre campus at Dewas (VERIFIED, LinkedIn company page).
- Vippy directors: Rahul Mutha (MD), Praneet Mutha (WTD), Usha Mutha, Pradeep Pandurang Mahajan, Nikhil Dhanotiya, Vivek Bhargava (VERIFIED, Tracxn). The company was founded by the late Prakash Mutha (VERIFIED, IndiaMART / annual report).
- **PROMUNCH founder: Parth Mutha** ("Founder and Chief Happiness Officer"). He studied at Boston University (BUild Lab / Innovate@BU) and Daly College. The brand started during COVID (2021) from a family/grandparents' recipe and was sold in person from late 2021. VERIFIED: https://www.globalindian.com/youth/story/cover-story/from-kitchen-to-amazon-the-journey-of-parth-muthas-promunch-protein-snacks . The LinkedIn showcase says he was "featured on the honorary Forbes Asia 30 Under 30 – Class of 2025 list" (VERIFIED as a brand claim, https://in.linkedin.com/showcase/promunch-healthy-products). His LinkedIn is https://in.linkedin.com/in/parth-promunch (12k followers).
- Manufacturing: early production was outsourced. The manufacturer sold his machinery during the second COVID wave, so PROMUNCH built in-house production. "Today we work directly with farmers within 100 kilometres of our factory in Dewas", visiting farms to check that no pesticides or chemicals are used (VERIFIED, founder LinkedIn post). Team size was 5 in 2024 plus influencers and campus ambassadors (VERIFIED, Global Indian). LinkedIn HQ is listed as Indore.

### 4.2 Contact (VERIFIED: /pages/contact and footer)
- Email **hello@promunch.in**. Cancellations go to **promunch@vippysoya.com** (shipping policy).
- Phones: **+91 81095 88699**, **+91 72722 58545**. The contact page's tel: link also embeds +91 96060 30616, which is probably stale.
- Address: Vippy Industries Limited, 28, AB Rd, Industrial Area No. 1, Dewas, Madhya Pradesh 455001.
- Hours: Mon–Sat 10 am–6:30 pm. Response time: 48 hours.

### 4.3 Sales channels
- **D2C Shopify** at promunch.in. It ships to 29 countries including the US, UK, UAE, AU, CA, SG and the EU (VERIFIED, meta.json). Shop Pay, Google Pay and COD are offered (COD is mentioned in the refund policy).
- **Amazon.in** (brand store "Pro Munch"; sold by Vippy Industries Ltd; Subscribe & Save) and **Amazon.com (US)** (VERIFIED). Ambition stated for Amazon UAE and Australia (VERIFIED, 2024 article).
- **Flipkart** (VERIFIED listings), **JioMart** (VERIFIED listing), **Blinkit** (VERIFIED brand page snippet). Zepto, Swiggy Instamart and BigBasket: **not found** (UNCONFIRMED).
- Health/D2C marketplaces: **Hyugalife**, **Nutrabay**, **Suspire**, **Fitreak**, **fetchnbuy**, **mystore.in**, **Tradesala**, **HYPD** (creator storefronts, e.g. "labelbypriyanka"). Export resellers: **pushmycart**, **silkrute.ca**, **desertcart** (all VERIFIED listings).
- **Corporate gifting / B2B**: own Corporate Diwali Hamper plus **Swageazy** (MOQ 50). "Trusted by Leading Hotels, Corporates, Workplaces" (VERIFIED claim). There is **no dedicated distributor, bulk or careers page** on the site (map/crawl found none). Bulk enquiries go through the contact page.
- **Offline**: the brand launched in retail early with 150g jars, which "did not work", then pivoted to **sampling: small pouches, vending machines, colleges, offices**. Retailers then began approaching the brand (VERIFIED, founder LinkedIn). Exhibitions: "PROMUNCH at the Exhibition 2026" (YouTube). **HYROX Mumbai** event presence has its own landing page (VERIFIED). Masters' Union / HYROX imagery appears in a creator's Sept 2026 post (UNCONFIRMED link).

### 4.4 Offers, policies
- Codes: **PROMUNCH10** (10% off above ₹399) and **PROTEIN15** (15% off above ₹499) (VERIFIED, cart drawer). Newsletter: "Get ₹50 off your first box" (VERIFIED); the older site offered "15% Off Your First Order". Creator codes exist elsewhere (none verified for PROMUNCH).
- **Shipping** (VERIFIED, /policies/shipping-policy): processing 5–7 business days; standard delivery 5–7 business days; cost by weight and address; tracking by email; international customs duties are paid by the customer. The product page says "FREE SHIPPING".
- **Cancellation**: within **12 hours**, and only if not processed or shipped. Refund within 14 business days (VERIFIED).
- **Refund/replacement** (VERIFIED, /policies/refund-policy): it contains the generic Shopify 30-day template, which still has "[INSERT RETURN ADDRESS]" and says food is non-returnable. The **VIL policy** is replacement only for leakage or damage, requested within 2–3 days with photo proof, no claims after 5 days, and the customer pays replacement shipping; COD and shipping charges are non-refundable. This conflicts with the "15-DAY RETURNS · CANCEL ANYTIME" product-page microcopy.
- Terms are governed by the laws of India (VERIFIED).

### 4.5 Social and content
- Instagram **@promunch.snacks** (VERIFIED link; a giveaway post references "@promunch.in" as well, UNCONFIRMED). Facebook **facebook.com/promunch.snacks** ("PROMUNCH Snacks | Dewas", 100% recommend from 9 reviews). YouTube **@PromunchYourMunchyPal** ("PROMUNCH Protein Snacks", 54 subscribers, 113 videos, mainly 15-second Shorts; YouTube links carry UTM `utm_source=Youtube&utm_medium=Organic+Shorts`). LinkedIn showcase **PROMUNCH Protein Snacks** (1,493 followers; "48% Plant-based Protein"). All VERIFIED.
- Example YouTube titles (VERIFIED): "PROMUNCH at the Exhibition 2026 | The King of Protein Snacks", "Roasted Edamame Beans Farm Visit | This Snack Has 42 g of Protein?!", "Funny Snack Break with PROMUNCH Roasted Edamame Beans 😂" (1.4K views), "Experience the power of protein with Promunch Ready to Eat!" (7.1K views, 2 years ago).
- Influencer/UGC: **@arjunfits** is featured in the homepage "Tag #promunch" wall (VERIFIED). Creator reels: @gaganchandnaa ("Upgrade from unhealthy snacks to Pro Munch Soya Crunchies 👌🏻 #crunchbetter"), @fitflex_nehal (Nehal Kansara), a Bangalore creator reel ("meet @promunch.snacks Edamame Beans") (VERIFIED snippets). There are giveaways ("We're giving away 6 packets … to 3 lucky winners") and a recipe reel (paneer + PROMUNCH). Campus ambassadors are paid a stipend plus product (VERIFIED, 2024).
- Founder-led LinkedIn content covers lessons, sourcing, edamame myth-busting and the launch announcement "Make way for the King of Protein Snacks 👑".
- **Blog** (`/blogs/news`, SEO-driven, Aug–Oct 2026; VERIFIED titles): Diwali Gift Ideas for Clients; Diwali Gift Ideas for Family; 15 Diwali Gift Ideas for Employees Under ₹1000 (2026); High-Protein Snacks for Kids' Lunchbox; Pre-Workout Snacks for Muscle Gain; How to Roast Edamame at Home (Oven + Air Fryer); Dry-Roasted vs Fried Edamame; High Protein Snacks in India: What Actually Works Between Meals; What Is Edamame? Benefits, Nutrition…; Gluten-Free Snacks: Roasted Edamame for Weight Loss; Edamame vs Makhana vs Peanuts vs Chips; Is Roasted Edamame a Good Post-Workout Snack? (vs protein shakes); Roasted Edamame vs Soya Crunchies; Is Edamame Good for Diabetes?; Edamame Beans vs Makhana; Can Roasted Edamame Replace Traditional Indian Namkeen?; Buy Edamame Beans in India (buying guide); Healthy Evening Snacks Indian for Office & Home; 15 Low Calorie Snacks Indian. **SEO focus**: "high protein snacks India", "roasted edamame", "healthy evening snacks", "low calorie snacks", "weight loss snacks", "Diwali corporate gifts under ₹1000", and comparisons against makhana, chips and protein shakes.
- **Recurring occasions** (VERIFIED from products, blogs and posts): **Diwali** (corporate and family hampers, the main seasonal push), **Raksha Bandhan** (Rakhi hamper, pack-of-2 "Rakshabandhan Gift" SKUs), International Yoga Day (founder post), HYROX/fitness events, exhibitions, back-to-school/tiffin, and IPL/movie-night style moments (inferred from copy).

### 4.6 Inferred creative needs and workflow (inference, not sourced)
- **Recurring creative outputs**:
  - Amazon/Flipkart listing images and A+ banners (1464×600-style modules titled "Why Promunch Himalayan Rock Salt", "Use Case", "Compare", "Combo").
  - Comparison infographics (vs makhana/chips/peanuts/namkeen).
  - Flavour-coloured pack hero shots on matching solid backgrounds.
  - Lifestyle scenes for desk, gym, travel, tiffin, movie night and chai.
  - 15-second Shorts/Reels, giveaway posts, creator-collab assets.
  - Festive campaign kits: Diwali corporate hamper decks/catalogues, Rakhi, greeting cards, hamper box art.
  - Blog featured images (1100 px wide).
  - Event/exhibition print: HYROX, expos, standees, sampling pouches and vending-machine wraps, QR-coded collateral.
  - Website section banners (the homepage uses custom illustrated blocks).
  - Packaging refreshes: the soya jar moved from the orange "Your Munchy Pal" label to the "Only the Good Stuff" labels. Amazon shows an "old vs new packaging" image.
- **Likely workflow**: a small in-house team led by the founder ("founders end up learning photography, lighting, editing, packaging, storytelling…") produces most assets. They combine DSLR shoots (`DSL_xxxx`) with heavy **AI image generation and editing**: ChatGPT images, Magnific "use the uploaded promunch pouch" prompts, Higgsfield-style `hf_` files, an AI ad generator (`simple-ads-…`), and Canva (`Untitled design`, `Copy of …`). Images are then uploaded straight to Shopify and reused across marketplaces and resellers, which explains why the same file names appear on suspire, fitreak and hypd. An agency (ControlF5) handles Shopify development. A social media team makes reels ("Office life = 70% work, 30% social media team dragging us into reels"). The tool should therefore support:
  - an uploaded pack photo used as a reference image,
  - flavour colour presets,
  - comparison-card templates,
  - marketplace image size presets,
  - festive templates,
  - copy generation in the brand voice.

---

## 5. Data-quality issues found on the live site (useful for the brand)
- Compare-at prices lower than the selling price on 6 soya SKUs, which shows as "Regular ~~₹270~~ Sale ₹300".
- The edamame-only template copy ("made only from edamame beans", 42.9g) also shows on soya, Vama and hamper pages.
- Nutrition numbers conflict (431 vs 428 kcal; 12.83 vs 12.3g fibre; 16.32 vs 15.86g fat; "14g protein / 100 kcal" serving claim).
- The returns microcopy contradicts the written policy. The refund policy still contains "[INSERT RETURN ADDRESS]".
- The footer "Snapchat" link points to LinkedIn. The shipping-policy email link has mismatched text and target.
- The old Rakhi URL redirects to the Diwali box. The Travel Combo handle ends in "copy-copy".

---

## 6. Assets

- Fonts: Archivo Black and Assistant are free Google Fonts (SIL Open Font License). The app loads them from Google Fonts.
- Logo and pack images could not be downloaded from this research environment (promunch.in and the marketplace image hosts were blocked). The URLs are listed in 1.1. Add the real files to `public/brand/` and set them in `src/brands/identity.ts`, and add each pack photo in the app under Packs & assets.
