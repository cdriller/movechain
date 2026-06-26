// MoveChain — system architecture diagram
// Build (standalone, auto-cropped):
//   typst compile architecture.typ architecture.svg
//   typst compile architecture.typ architecture.pdf
//
// Emphasis: the rider is ONLINE only to buy credits. Starting/stopping a
// trip is fully OFFLINE (just a signature); the operator relays everything.

#import "@preview/cetz:0.3.4"

#import "badge.typ": step-badge-fill, step-badge-stroke, step-badge-stroke-thickness, step-badge-radius-cetz, step-badge-font-size-cetz

#set page(width: auto, height: auto, margin: 10pt, fill: white)
#set text(font: "Helvetica Neue", size: 11pt)

#let accent = rgb("#2f6fae")
#let accent-dark = rgb("#1f4e79")
#let soft = rgb("#eef3f8")
#let grey = luma(45%)

#cetz.canvas({
  import cetz.draw: *

  // ---- node helper --------------------------------------------------------
  let node(x, y, w, h, body, fill: white, stroke-col: accent-dark, dash: none) = {
    rect(
      (x - w/2, y - h/2), (x + w/2, y + h/2),
      radius: 0.14, fill: fill,
      stroke: (paint: stroke-col, thickness: 1.3pt, dash: dash),
    )
    content((x, y), body)
  }
  // ---- arrow label helper (white background) ------------------------------
  let lbl(x, y, body, col: black) = content(
    (x, y), text(fill: col, size: 10pt, body),
    frame: "rect", fill: white, stroke: none, padding: 0.08,
  )
  // ---- numbered step badge on an arrow (shared style: poster/badge.typ) ----
  let step(x, y, n) = {
    circle((x, y), radius: step-badge-radius-cetz, fill: step-badge-fill,
           stroke: (paint: step-badge-stroke, thickness: step-badge-stroke-thickness))
    content((x, y), text(size: step-badge-font-size-cetz, weight: "bold", fill: accent-dark)[#str(n)])
  }

  // ===== ON-CHAIN zone background (MIDDLE) =================================
  rect((5.9, 1.0), (11.1, 8.2), radius: 0.25, fill: soft,
       stroke: (paint: accent, thickness: 1.2pt, dash: "dashed"))
  content((6.1, 7.85), anchor: "west",
          text(fill: accent-dark, weight: "bold", size: 13pt)[ON-CHAIN])

  // ===== nodes =============================================================
  // left: rider (top) + operator (bottom)
  node(2.4, 7.0, 3.2, 1.5, [
    #text(weight: "bold")[Rider]\
  ])
  step(1.4,7.0, "1a")
  step(3.4,7.0, "1b")

  node(2.4, 3.3, 3.4, 1.7, [
    #text(weight: "bold")[Operator]\
  ])
  // middle: on-chain contracts
  node(8.5, 5.5, 4.6, 2.0, [
    #text(weight: "bold")[MoveChain contract]\
    #align(center)[
      #text(size: 9pt, fill: grey)[EIP-712]
    ]
  ])
  node(8.5, 2.7, 4.6, 1.5, [
    #text(weight: "bold")[TripCredits contract]\
    #align(center)[
      #text(size: 9pt, fill: grey)[ERC-1155]
    ]
  ])
  // right: admin
  node(13.8, 5.0, 3.2, 1.4, [
    #text(weight: "bold")[Admin]\
  ])

  // ===== ON-CHAIN internal: mint / burn ===================================
  line((8.5, 4.5), (8.5, 3.45), stroke: (paint: gray, thickness: 1.2pt),
       mark: (end: ">"))

  // ===== (A) buy credits — the ONLY online step for the rider =============
  line((4.0, 7.0), (6.2, 6.0),
       stroke: (paint: accent, thickness: 1.8pt), mark: (end: ">"))
  step(5.15, 6.95, "B")

  // ===== (B) rider signs start/stop offline -> QR to operator ============
  line((2.4, 6.25), (2.4, 4.15), stroke: (paint: accent, thickness: 1.5pt),
       mark: (end: ">"))
  step(2.0, 5.2, 2)

  // ===== (C) operator relays the rider's signatures on-chain =============
  line((4.1, 3.85), (6.2, 5.0), stroke: (paint: accent, thickness: 1.5pt), mark: (end: ">"))
  step(5.15, 3.95, 3)

  // ===== (E) admin configures the platform ===============================
  line((12.2, 5.1), (10.8, 5.5), stroke: (paint: accent, thickness: 1.5pt), mark: (end: ">"))
  step(11.5, 5.7, "A")

})
