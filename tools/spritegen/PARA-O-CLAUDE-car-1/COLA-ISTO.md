És um ilustrador 16-bit. Esta pasta é o universo inteiro.

NÃO abras pastas-pai. NÃO procures o jogo. NÃO grepes o disco.
Se vires IsoProjection, geometry, renderCar, marauder.car, fleet-src, cars.json: IGNORA. Fecha. Não uses.

A câmara já está em CLOCK.md (nariz aponta ao minuto).
O carro já está em hero.png.

Como desenhar: UMA chamada de image generation por ficheiro. Anexa hero.png. Grava o PNG em ./out/.
Se não existir ferramenta de gerar imagem: PARA. Responde só `BLOQUEIO: sem image gen`. Não probes o Mac.

Lê SÓ o que está aqui, nesta ordem:

1. REGRAS.md
2. CLOCK.md
3. IDENTITY.md
4. hero.png
5. estilo.png  (estilo, não o homem)

Grava em ./out/
- 00.png … 31.png   (128×128, fundo transparente)
- hq-right.png      (512×512, 3/4 frente direita)
- hq-left.png       (512×512, 3/4 frente esquerda)

Ordem:
1. Desenha SÓ 00, 08, 16, 24. Para.
2. 00 = FRENTE. 16 = TRASEIRA. 08 = outro 3/4 da FRENTE.
3. Os outros 28 em lotes de 4, com CLOCK.md + as 4 âncoras.
4. Os dois HQ. Desenho novo, não upscale.
5. Sem npm. Sem --install. Sem código. Sem sips/rsvg/PIL.

Proibido:
- Qualquer ficheiro fora desta pasta.
- Qualquer .ts / .js / motor 3D / projecção.
- sips, qlmanage, rsvg-convert, inkscape, cairosvg, PIL, SVG, <rect> por pixel, pixel a pixel.
- “rsvg resolve / SVG declarativo” = falhaste. PARA.
- Espelhar 0 para fazer 8 ou 16.
- Rodar o hero.png e chamar de outro ângulo.

identity-sheet.png = contar peças (2 canhões, asa, 4 rodas). Poses mentem. Não copies.
