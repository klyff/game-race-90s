# Orange Bomber

- **id / pasta:** `9-muscle-orange-bomber-combat`
- **displayName / como chamar:** Orange Bomber
- **callName:** Orange Bomber
- **hero:** frame 07 → `car_hero.png` (loja, garagem, resultados)
- **nível:** heavy · world 3 (Bogmire Deep) · arsenal · **$570k**
- **strip:** 32 frames · índice 0 = 6h · +11.25° anti-horário
- **origem:** pintura do Klyff (style) + spinner CCW; âncora frame 0 = `gz1`

## Loja (game-ui)

Aparece no catálogo a partir do **mundo 3**. Preço de lista **$570k** (sell = 80% = $456k). Hero da vitrine = frame 07. Stat bars devem ler mais forte que Blue Combat e Fast Greenhish — velocidade, armadura e grip plantado.

## Física (arcade / godot-genre-racing consult)

Fun > realism. COM baixo (massa + grip). Melhor que Azul (68) e Verde (66); ainda abaixo do Marauder 78. Twin gatlings no capô → arsenal.

| stat | Blue Combat | Greenhish | Orange Bomber |
| --- | ---: | ---: | ---: |
| mass | 920 | 960 | 1100 |
| enginePower | 31 | 31 | 35 |
| brakeForce | 43 | 46 | 50 |
| maxSpeed | 68 | 66 | **73** |
| grip | 27 | 30 | **33** |
| steerRate | 2.75 | 2.65 | 2.55 |
| steerSpeedFalloff | 0.50 | 0.46 | **0.40** |
| armor | 0.33 | 0.40 | **0.50** |
| ammoCapacity | 10 | 13 | **16** |
| price | $50k | $320k | **$570k** |
| unlock | world 1 | world 2 | **world 3** |
