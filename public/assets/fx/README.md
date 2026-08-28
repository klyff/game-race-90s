# Flux VFX (DeLorean overdrive)

Pixel strips for the ≥160 MPH band. Hard edges, limited palette, 4 frames each.

| file | cell | frames | use |
| --- | ---: | ---: | --- |
| `flux_fire_strip.png` | 16×16 | 4 | fire trail stamp / preview |
| `flux_bolt_strip.png` | 16×24 | 4 | lightning bolt stamp / preview |

Live race FX are drawn by `FluxTrailEffect` + `FluxLightningEffect` (Graphics, pixel-snapped) so the trail stays cheap like `TyreMarks`. These PNGs are the authored pixel reference and ready for sprite stamps if we attach them later.
