# Regras — tira de relógio (car-1)

És um ilustrador. Desenhas o carro do `hero.png` olhando para `CLOCK.md`.
Não há motor. Não há projecção. Não há geometria 3D.

Lê `CLOCK.md` antes de cada imagem. Não abras mais nada.

## Contrato

- **32 frames.** 1 frame = 11,25° = 1,875 min no relógio. Não mudes N.
- Célula **128×128**. O carro não toca a borda. O tamanho vem dos sólidos fixos — não enchas a célula.
- Âncora: centro do chassis no asfalto = pixel **(64, 70)** em todos os frames.
- Frame 0 = nariz **baixo-direita**. Índice a subir = **horário no ecrã**.
- Frente ≠ traseira. Frame 0 e 16 são opostos (grelha vs spoiler).
- Estilo 16-bit chunky: `hero.png` + `estilo.png`. Sem blur. Sem foto-real. Sem armas extra.

## Proibido

- Sair desta pasta. Grep/Glob/Read em pastas-pai.
- Abrir `IsoProjection`, `geometry.ts`, `renderCar.ts`, `marauder.car.ts`, `import-fleet`, `cars.json`, `fleet-src`.
- Escrever código que projecte caixas 3D. Raster CPU não é o método.
- `sips`, `qlmanage`, `rsvg-convert`, `inkscape`, `cairosvg`, PIL, pngjs, SVG, `<rect>` por pixel, canvas, pixel a pixel.
- Se não houver image generation: parar. Não improvisar um pipeline.
- Copiar poses de `identity-sheet.png`.
- Rodar / shear o `hero.png` e chamar de outro ângulo.
- Espelhar o frame 0 para fazer o 8 ou o 16.
- Mudar escala de frame para frame.
- Rodar a tira no fim para “corrigir” o yaw.

## Ordem

1. Lê `IDENTITY.md` + `hero.png`.
2. Desenha só `out/00.png`, `out/08.png`, `out/16.png`, `out/24.png`.
3. Confirma: 00 é frente, 16 é traseira, 08 é o outro 3/4 da **frente**.
4. Desenha os 28 restantes em lotes de 4.
5. Desenha `out/hq-right.png` e `out/hq-left.png` (512×512, desenho novo).
6. Frame que falhar: redesenha esse. Não rodes a tira.
7. Não corras npm. Só escreves em `./out/`.

## Prompt de cada célula 128×128

```
16-bit isometric combat-racing car sprite, chunky pixel art, crisp pixels, no blur, no photorealism, no background.
128x128 canvas, transparent ground. Chassis center on asphalt at pixel (64, 70).
World size is FIXED (~4.0 long, 1.9 wide, 1.2 tall). This pose the car is about {w}×{h} pixels. Do not fill the cell. Empty space is correct.
Orthographic 2:1 isometric. Camera fixed.
Same car as the attached hero.
Pose frame {k} of 32. Minute hand at {minute} ({face}). Nose points {nose} on screen.
Visible: {sees}.
Draw this yaw from scratch. Do not mirror another frame.
```

## Prompt de cada HQ 512×512

```
16-bit isometric combat-racing car, chunky pixel art, crisp pixels, no blur, no photorealism.
512x512 canvas, transparent ground, car large in frame with a small margin.
Same car as the attached hero.
Three-quarter front {right|left}, nose {down-right|down-left}.
Headlights and hood weapons visible. Not a rear view.
```
