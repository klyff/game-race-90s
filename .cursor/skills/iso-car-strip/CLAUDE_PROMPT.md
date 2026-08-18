# Claude Code — desenhar um carro (tira de relógio)

Cola isto no Claude Code. Anexa a pasta `tools/spritegen/handoff/{carId}/`. Não abras a tira velha.

```
Lê e segue à letra:

1. .cursor/skills/iso-car-strip/SKILL.md
2. .cursor/skills/iso-car-strip/CLOCK.md
3. tools/spritegen/handoff/{carId}/IDENTITY.md
4. tools/spritegen/handoff/{carId}/refs/hero.png  (o modelo — identidade visual)

Tarefa: redesenhar ESTE carro em 32 poses isométricas + 2 stills HQ.
Não resample, não sheares, não flips da tira antiga.
Não abras public/assets/cars/{carId}.png nem fleet-src para copiar ângulos.

Contrato (relógio, 32 frames, imutável):
- 60 min = 360°. 1 frame = 11.25° = 1.875 min.
- Frame 0 = minuto 22.5 (4:30) = nariz BAIXO-DIREITA = +X iso.
- Frame k = minuto (22.5 + k×1.875) mod 60. Walk HORÁRIO no ecrã.
- Célula 128×128, 4px de respiro, fundo transparente.
- Âncora no chão: centro do chassis no asfalto = pixel (64, 70) em TODOS os frames.
- Frente ≠ traseira em todos os 32. Frame 0 e 16 são OPOSTOS (grelha vs spoiler).
- Estilo 16-bit chunky como o hero e public/assets/cards/klyff.png. Sem blur, sem foto-real.

Ordem:
1. Desenha SÓ 00.png, 08.png, 16.png, 24.png em tools/spritegen/redrawn/{carId}/
2. PARA. Confirma: 00 mostra frente, 16 mostra traseira, 08 é o outro 3/4 da FRENTE (não da mala).
3. Desenha os 28 restantes em lotes de 4, sempre com CLOCK.md + as 4 âncoras como refs.
4. Desenha hq-right.png e hq-left.png (512×512, 3/4 frente direita e esquerda). Não é upscale do 64px.
5. Corre:
   npm run gen:qa-strip -- {carId}
   npm run gen:pack-redrawn -- {carId}
6. Frame que falhar: redesenha ESSE frame. Não rodes a tira.

Piloto actual: car-1 (Marauder). Troca {carId} se a pasta for outra.
Não corras --install. Isso é do humano depois da corrida de teste.
```
