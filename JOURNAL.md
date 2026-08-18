# JOURNAL

## 2026-08-17 — A câmara passa a dirigir a corrida

Âncora: `e95a4c1` Add the off-track jump wreck to the T-050 ramp plan.
A câmara virou convenção de corrida: curva fecha, recta rápida abre; home 1.75; `[` `]` seguram 10s; tecla 0 devolve o director.
Nasceu o `CameraDirector` com `gen:cameras` e a skill `isometric-cam-man` — triggers de curva, recta, velocidade e rampa.
Quem desiste estaciona na parede interior; o espectador segura um choque de dois ou mais carros e depois volta ao líder.
Thunder Basin ganhou bidões de gasolina no ombro; minas e gasolina rebentam no sítio do hazard.
T-050 ficou trancada no papel: `launchSpeed` é o chão da rampa, 45° abaixo de 45% recusa em ré, arco fora da pista explode e respawna na linha.
Hit e explosão empurram a câmara; HUD e áudio acompanharam o novo campo.

## 2026-08-17 — A frota-relógio entra no watch

Âncora: `87b89b2` Put the race sheets back and add a ten-car watch on every planet II.

A frota nova (`car_2`…`car_32`) ganhou tiras em `public/assets/cars/` e o `cars.json` cresceu com elas.
O watch de dez carros na pista II de cada planeta passa a preferir essa frota-relógio quando há tiras suficientes; o pack B (reserva) continua a alternar.
`pack-redrawn` e o mapa de colisão aceitam ids `car_N`: sem modelo próprio, caem no marauder.
Carros 18, 22 e 23 avançaram no redraw (frames + HQ + strip).
Testes de manifest, watch, golden sprites e voltas acompanharam o pack.
Nasceu o `SUMMARY.md` (norte do produto) e a skill `game-jornal` para o dia caber em seis linhas.
