// Build:  typst compile movechain-poster.typ
// Watch:  typst watch movechain-poster.typ

#import "@preview/cades:0.3.1": qr-code

#set page(
  width: 594mm, // A1 Dimensions, requirement
  height: 841mm, // A1 Dimensions, requirement
  margin: (x: 24mm, top: 18mm, bottom: 18mm),
)

// ---- Typography ------------------------------------------------------------
#set text(font: "Helvetica Neue", size: 24pt, fill: black, lang: "en")
#set par(justify: true, leading: 0.6em)

// ---- Palette (B/W-safe: mid blue -> mid grey, white text stays readable) ---
#let accent = rgb("#2f6fae")
#let accent-dark = rgb("#1f4e79")
#let soft = rgb("#eef3f8")
#let line-grey = luma(55%)

#import "badge.typ": step-badge

// ---- Section with a coloured header bar -------------------------------------
#let section(title, body) = block(width: 100%, breakable: false, below: 8pt)[
  #block(
    width: 100%,
    fill: accent,
    inset: (x: 14pt, y: 7pt),
    radius: (top: 6pt, bottom: 0pt),
  )[#text(fill: white, weight: "bold", size: 24pt)[#title]]
  #block(
    width: 100%,
    inset: (x: 14pt, y: 9pt),
    stroke: (left: 1pt + accent, right: 1pt + accent, bottom: 1pt + accent),
    radius: (bottom: 6pt),
  )[
    #set text(size: 20pt)
    #body
  ]
]

#let cap(t) = align(center)[#text(size: 14pt, style: "italic", fill: luma(35%))[#t]]

// ---- helpers ---------------------------------------------------------------
#let node(num, desc) = box(
  width: 100%,
  inset: 11pt,
  radius: 6pt,
)[
  #grid(
    columns: (auto, 1fr),
    column-gutter: 10pt,
    align: (left + horizon, left + horizon),
    step-badge(num),
    [
      #text(size: 18pt)[#desc]
    ],
  )
]
#let down = align(center)[#text(size: 24pt, fill: accent-dark)[$arrow.b$]]

#let qr(url, label) = align(center)[
  #box(width: 92pt, height: 92pt, stroke: 1.4pt + accent-dark, radius: 4pt)[
    #align(center + horizon)[
      #qr-code(url)
    ]
  ]
  #v(3pt)
  #text(size: 14pt, weight: "bold", fill: accent-dark)[#label]
]

#let subhead(t) = text(weight: "bold", size: 19pt, fill: accent-dark)[#t]
// ===========================================================================
// Header
// ===========================================================================
#grid(
  columns: (1fr, auto),
  align: (left + horizon, right + horizon),
  text(size: 16pt, fill: luma(35%))[Transit (Assignment 3)],
  text(size: 16pt, fill: luma(35%))[Work-in Progress Poster · Programmierpraktikum Smart Contracts SoSe 2026],
)
#v(2pt)
#line(length: 100%, stroke: 0.8pt + line-grey)
#v(8pt)

// ===========================================================================
// Title
// ===========================================================================
#grid(
  columns: (1fr, auto, 1fr),
  column-gutter: 22pt,
  align: (center + horizon, center + top, right + horizon),
  [
    #image("tu-berlin-logo.svg", height: 124pt)
  ],
  [
    #align(center + top)[
      #text(size: 58pt, weight: "bold", fill: accent-dark)[MoveChain]
      #v(1pt)
      #text(size: 30pt, weight: "medium", fill: accent)[Ride offline operate online]
      #v(4pt)
      #text(size: 18pt)[Daniel Laudien · Jurek Heller · Carlos Driller]
    ]
  ],
  qr("https://git.tu-berlin.de/laudien/movechain", [The Repo]),
)

#v(12pt)

// ===========================================================================
// BODY
// ===========================================================================
#grid(
  columns: (1fr, 1fr), column-gutter: 22pt,
  section("The Problem: Forced App Usage")[
    // People who want to get from A to B need a different app for almost every operator (bus, tram, metro, ride-share, e-scooters).
    // And even where one "super app" exists, you can never be sure another app offers a better deal.
 People who want to get from A to B often need a different app for almost every operator (bus, tram, metro, ride-share, e-scooters). Even where one “super app” exists, riders cannot be sure another app offers a better fare. Moreover, a smartphone app is unavailable when the device has no battery or no network. A dead phone is as useless as having no ticket.

 // mayb different prices for different fares instead of different apps

    /*
    mündlich:
    - tourists don't have to think about the best fare (daily ticket, Kurzstrecke, 4-Fahrten-Karte)
    */
  ],
  section("The Solution: Replace Multiple Apps By A Single Wallet")[
    We wanted to build an interface where all operators can sing in and give riders the possibility to buy trips.
    Instead of different apps for every operator the rider only needs a single wallet to pay a trip at any operator.
    The prices are saved on chain and can not be changed once the operator signed in.
    Because of this the prices only vary with the ETH-price and can not be increased manually by the operators.

    // würde das nicht erwähnen, dass der contract dafür sorgt, dass man besten preis bezahlt, weil das in der prio so weit hinten ist bis wir das implementieren würden
  ],
)

#section("Design Decisions And Assumptions")[
  #grid(
    columns: (1fr, 1fr), column-gutter: 24pt,
    [
      - Three stakeholders: Rider, Operator, Admin
      - Flat fare per operator, independent of distance or time
      - No price caps for riders who ride frequently
      //- Trips are always started and stopped through turnstiles, ensuring that only one active trip per rider exist.
        //one active trip per rider at a time.
      - Fixed-station, multi-passenger transit only, e.g. metro, tram, bus, light rail
    ],
    [
      - Turnstiles are used everywhere, ensuring only one active trip per rider at a time
      - No bulk discount on large top-ups, removing the decision burden for riders
      - Fixed exchange rate between ETH and our TripCredits.
      - No on-chain history of completed trips. Operators can keep their own history
    ],
  )
]

#section("The Prototype")[
  //A signature is created with a deadline to prevent misuse by the operator and an indicator if the trip should be started or stopped and signed with the public key of the rider off-chain. On-chain the signed payload is verified using an EIP-712 contract and the request is authorized or denied.
  A rider generates an off-chain EIP-712 signature indicating if the trip should be started or stopped, including a deadline to prevent misuse. The signature is submitted by the operator on-chain, where it is verified and the request is granted or rejected.
  #grid(
    columns: (0.5fr, 1.1fr, 0.3fr), column-gutter: 22pt, align: (top, top),
    [
      #grid(
        columns: (1fr), row-gutter: 4pt,
        subhead[Start/End Trip],
        node("1a", "Rider decides to start trip by selecting an operator and generating a signature for it"),
        node("1b", "Rider decides to stop trip and signature is created with the operator for which the trip was started"),
        node("2", "Rider gives the signature to the operator by showing a QR code"),
        node("3", "Operator starts/completes trip for rider on-chain and pays the gas price"),// Trip closed on-chain"),

        v(6pt),
        subhead[Supportive User Stories],
        node("A", "Admin whitelists/removes operator and sets their name"),
        node("B", "Rider buys trip credits with ETH"),
      )
      #v(6pt)
    ],
    [
        #block(inset: 7pt, radius: 6pt, stroke: 1pt + line-grey, fill: white)[
          #image("architecture.svg", width: 100%)
        ]
        //#grid(
        //    columns: (1fr, 1fr), column-gutter: 16pt, align: top,
       //)
    ],
    [
      #grid(
        columns: (1fr), row-gutter: 8pt,
        [
          #v(25pt)
          #qr("https://movechain.vercel.app",[The Prototype])
          #v(50pt)
          #qr("https://sepolia.etherscan.io/address/0xE5D4B600fA9BE3e00dABcef13F30b60691569D34",[The contract on Etherscan])
        ]
      )
    ]

  )
]

#grid(
  columns: (1fr, 1fr), column-gutter: 22pt,
[
#section("Benefits Of Our Architecture",[
  // Our architecture brings public transport away from the operators and back to the public.

  Movechain enables the riders to just hop in and ride with public transport. Through a simple payment process they don't have to carry paper tickets or run apps on their phones but just need a wallet. Riders don't have to worry about prices because they are fix.
  Using public transport can be done completely offline.
  Only buying TripCredits is online and by building ticket machines at the stations even this could get offline.
  Another benefit is that the rider really only pays the price for the trip and not also the gas. This prevents hidden costs for the riders.
        
        // #v(6pt) A trip that is opened but never confirmed by the rider costs nothing — fares are charged only on the rider-signed completion.
        // -> ist nicht wirklich ein Vorteil, sondern eher eine Lücke im Konzept
])
#section("From QR to NFC tap: Removing The Need For A Smartphone",[
Although the prototype is demonstrated through a smartphone-based web interface, smartphone ownership is not a structural requirement of the on-chain system. MoveChain presupposes only a signing-capable wallet: a device or medium that can receive off-chain trip context, produce a cryptographically verifiable signature, and transmit that signature to the operator for on-chain submission.

#v(8pt)
#block(inset: 7pt, radius: 6pt, stroke: 1pt + line-grey, fill: white)[
  #image("nfc-workflow.svg", width: 100%)
]
#cap[Figure 2: The NFC Flow mirrors the QR-Code prototype]

The same authorization as in the QR-Code prototype is produced through NFC interaction: the tap confirms the rider’s intent, the operator sends trip context to the wallet (rather than the rider selecting an operator in a browser), the wallet signs and returns the signature directly (rather than encoding it in a QR code). On-chain verification and operator-paid transaction fee remain unchanged.

])
],

// ---- (6) Limits & next steps + (7) Lessons learnt  (beside Figure 2) --------
[
#section("Scope, Limits & Next Steps")[
      MoveChain focuses on the on-chain service. Everything off-chain is
      example implementation. In the end operators decide how they run it.

      #subhead[Next Steps]
      - A flow without MetaMask — signing/submitting automated at the gate instead of a manual wallet click
      - An offline verification of the rider's signature, so riders are processed fast at the gate without waiting twelve seconds for the chain.
]

#section("Lessons Learnt While Working With Smart Contracts")[
- Contract addresses are fixed only after deployment, unlike stable Web2
  backend URLs, complicating deployment of frontend and Smart Contract.
- Dedicated RPC providers (e.g. Alchemy) require careful setup and monitoring; our private Alchemy endpoint failed where a public RPC succeeded, so availability and configuration must be validated explicitly.
- Deploying TripCredits separately from MoveChain preserves token state
  and reduces redeployment cost during iterative testing.
- Split contracts aid prototyping: token balances and platform state can survive when only a single contract is redeployed. Few contracts are usually cheaper in production, because gas costs are saved. Optimize for fast iteration in development and testing, optimize for gas efficiency and operational simplicity when shipping.
]

// Smaller IEEE list for the poster (global text is 24pt)
#show bibliography: set text(size: 14pt)
#show bibliography: set par(leading: 0.55em)

#section("References")[
  #bibliography(
    "references.bib",
    style: "ieee",
    title: none,
    full: true,   // show all entries, even if not cited in the text
  )
]
],
)
