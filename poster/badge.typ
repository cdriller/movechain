// Shared numbered step-badge style (poster flow nodes + architecture arrows).

#let accent-dark = rgb("#1f4e79")

#let step-badge-fill = white
#let step-badge-stroke = accent-dark
#let step-badge-stroke-thickness = 1.1pt

// Poster (A1 flow nodes)
#let step-badge-size-poster = 30pt
#let step-badge-font-size-poster = 16pt

#let step-badge(num) = box(
  width: step-badge-size-poster,
  height: step-badge-size-poster,
  radius: 50%,
  fill: step-badge-fill,
  stroke: step-badge-stroke-thickness + step-badge-stroke,
  inset: 0pt,
)[
  #align(center + horizon)[
    #text(weight: "bold", fill: accent-dark, size: step-badge-font-size-poster)[#num]
  ]
]

// Architecture diagram (CeTZ canvas, cm units)
#let step-badge-radius-cetz = 0.30
#let step-badge-font-size-cetz = 9pt
