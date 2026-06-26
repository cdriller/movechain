// MoveChain — NFC handoff (rider ↔ operator)
// Build:
//   typst compile nfc-workflow.typ nfc-workflow.svg

#import "@preview/cetz:0.3.4"

#import "badge.typ": step-badge-fill, step-badge-stroke, step-badge-stroke-thickness, step-badge-radius-cetz, step-badge-font-size-cetz

#set page(width: auto, height: auto, margin: 10pt, fill: white)
#set text(font: "Helvetica Neue", size: 11pt)

#let accent = rgb("#2f6fae")
#let accent-dark = rgb("#1f4e79")

#cetz.canvas({
  import cetz.draw: *

  let node(x, y, w, h, body) = {
    rect(
      (x - w/2, y - h/2), (x + w/2, y + h/2),
      radius: 0.14, fill: white,
      stroke: (paint: accent-dark, thickness: 1.3pt),
    )
    content((x, y), body)
  }

  let lbl(x, y, body) = content(
    (x, y), text(fill: accent-dark, size: 9pt, body),
    frame: "rect", fill: white, stroke: none, padding: 0.08,
  )

  let step(x, y, n) = {
    circle((x, y), radius: step-badge-radius-cetz - 0.07, fill: step-badge-fill,
           stroke: (paint: step-badge-stroke, thickness: step-badge-stroke-thickness))
    content((x, y), text(size: step-badge-font-size-cetz, weight: "bold", fill: accent-dark)[#str(n)])
  }

  let rider-x = 2.8
  let op-x = 10.2
  let mid-x = (rider-x + op-x) / 2

  node(rider-x, 4.0, 3.2, 1.6, text(weight: "bold")[Rider])
  node(op-x, 4.0, 3.2, 1.6, text(weight: "bold")[Operator])

  line((4.4, 4.85), (8.6, 4.85),
       stroke: (paint: accent, thickness: 1.5pt), mark: (end: ">"))
  step(mid-x - 0.7, 4.85 + 0.35, 1)
  lbl(mid-x + 0.12, 4.85 + 0.35, [Tap])

  line((8.6, 4.0), (4.4, 4.0),
       stroke: (paint: accent, thickness: 1.5pt), mark: (end: ">"))
  lbl(mid-x - 0.12, 4.0 + 0.35, [Context])
  step(mid-x + 1.0, 4.0 + 0.35, 2)

  line((4.4, 3.15), (8.6, 3.15),
       stroke: (paint: accent, thickness: 1.5pt), mark: (end: ">"))
  step(mid-x - 1.1, 3.15 + 0.35, 3)
  lbl(mid-x + 0.12, 3.15 + 0.35, [Signature])

})
