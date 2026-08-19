# JOURNAL

## 2026-08-19 — Cérebro V2 na pista e pelotão de treze

Âncora: `bd2c235` Fix Vercel builds by indexing race steps per grid seat.
O cérebro NPC V2 ficou em `main`: RECOVER passou a modo de controlo; no mix 2-2-2 ninguém ficou preso a recuperar.
Os 30 da matriz ganharam handling, perk e planeta de casa; a largada da Basin ficou mais lenta.
A grelha aponta pela seta 2:1 da linha; caixotes e bidões voltaram à berma, 60% a mais.
Minas e mísseis cresceram; as rampas arcade saltam a um terço da laje, com arco mais baixo.
A carreira passou a treze na grelha; o Vercel indexa o passo por lugar e o build sobe.
Comic de origem, escolha de personagem e retratos HERO 300 chegaram; o narrador fala EN e pt-BR.

## 2026-08-18 — Relatórios da IA num pack para ler

Âncora: `20a746b` Add skill-mix grids to debug-IA races.
Os 30 perfis NPC saíram para catálogo (json + tabela).
Três baterias de teste (lottery 177 s, mix 2-2-2, QA 3 pistas) foram juntas com logs por piloto.
A linha de Thunder Basin II ficou em SVG; os 6 traçados do mix têm PNG + legenda.
O pack completo está em `/tmp/NPCs/` (texto primeiro; desenhos ao lado).
Cópia leve no repo: `docs/ia/`.
RECOVER ainda come a corrida; Bogmire fecha 0 voltas — tuning, não falta de perfil.

## 2026-08-18 — Frota, rampas e cérebros na Basin II

Âncora: `20a746b` Add skill-mix grids to debug-IA races.
A frota do relógio (`car_2`…) entrou na pista com tiras e ícones de arma no HUD.
Caixotes e bidões nas bermas partem-se a meio da corrida.
Rampas T-050: o salto sai da velocidade do carro, o void rebenta, Basin I/II ganharam lábios escritos.
O motor corta aos 3,5 s parado; o narrador continua depois da bandeira.
Nasceu a matriz de rotação (`public/matrix_car`, relógio, metades A/B).
Debug-IA corre 2 experts / 2 médios / 2 bobos, log por piloto, e dá para ver no browser.

## 2026-08-17 — Camera now directs the race

Âncora: `e95a4c1` Add the off-track jump wreck to the T-050 ramp plan.
Camera = race convention: corner closes, fast straight opens; home 1.75; `[` `]` hold 10s; key 0 return director.
`CameraDirector` + `gen:cameras` + skill `isometric-cam-man` — triggers: corner, straight, speed, ramp.
Quitter parks inner wall; spectator holds 2+ car smash, then back to leader.
Thunder Basin got gasoline drums on shoulder; mines + gasoline burst at hazard site.
T-050 locked on paper: `launchSpeed` = ramp floor, 45° below 45% refuse reverse, arc off-track explode + respawn on line.
Hit + explosion shove camera; HUD + audio follow new field.

## 2026-08-17 — Clock-fleet enters watch

Âncora: `87b89b2` Put the race sheets back and add a ten-car watch on every planet II.
New fleet (`car_2`…`car_32`) got strips in `public/assets/cars/`; `cars.json` grew.
Watch ten cars on each planet II prefer clock-fleet when strips enough; pack B (reserve) still rotates.
`pack-redrawn` + collision map accept `car_N` ids; no own model → marauder.
Cars 18, 22, 23 advanced redraw (frames + HQ + strip).
Manifest, watch, golden sprite, lap tests followed pack.
`SUMMARY.md` (product north) + skill `game-jornal` so the day fits six lines.
