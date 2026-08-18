# T-050 — Rampas arcade (fechar Thunder Basin)

Isto não é física da Terra com um desenho em cima. É um jogo de corrida dos 90s:
a rampa é um *trick* — o `launchSpeed` da zona é só o **chão fixo**; o impulso
real é essa base **mais** as variáveis do carro no instante em que encosta.
Ângulo + ritmo + turbo decidem se o salto é um hopzinho, um voo estúpido, uma
ré sozinha porque a rampa ganhou, ou um arco que sai da pista — cai lá fora,
explode, e volta na linha a seguir à rampa.

A gravidade terrestre (`RAMP_GRAVITY = 40`) continua a ser a **linha de base
do ar**. Os bónus abaixo são multiplicadores em cima do impulso já somado,
nunca um segundo integrador. Sem rolagem de sprite — só física + sprite
elevado + sombra no chão.

---

## Já feito — não reescrever

- `RampZone`, `RAMP_GRAVITY`, `rampPeakHeight`, `rampAirtimeSeconds`, `rampZoneAt`
- `integrateAirborne` (gravidade + clamp no chão)
- `OnTrackStep` lança na zona, `AIRBORNE_SURFACE`, paredes ignoradas no ar
- `RaceField` salta contacto carro-a-carro e hazards enquanto `isAirborne`
- `VehicleView.sync` — sprite em `state.height`, sombra no asfalto
- Thunder Basin já declara 3 zonas; `TrackRenderer.drawRockRamps` já desenha lajes
- Hop (Space) é outro sistema (`hopLaunchSpeed` por massa/`maxSpeed`). Não misturar.

O que o brief antigo chamava “dormant” já não está: a pista lança e o carro voa.
O que falta é o **feel de jogo** e o fecho verificável da T-050.

---

## Decisões de design (arcade, não real)

### 1. Launch = base da zona + soma do carro no ponto zero

`zone.launchSpeed` **não** é o impulso do salto. É a constante da rampa
(o trampolim). O impulso real mede-se no **primeiro frame grounded em que
o carro encosta** na zona (`rampZoneAt` + `!isAirborne`):

```
speedFrac  = forwardSpeed / stats.maxSpeed          // pode ser negativo (ré)
accelFrac  = clamp(forwardAccel / stats.enginePower, -1, 1)
turboTerm  = turboActive ? TURBO_SPEED_BONUS : 0    // 0.35

carForce   = speedFrac + accelFrac + turboTerm      // soma das variáveis

vertRaw    = zone.launchSpeed + LAUNCH_CAR_SCALE * carForce
horizRaw   = forwardSpeed * (1 + LAUNCH_HORIZ_SCALE * max(0, carForce))
```

`forwardAccel` é a aceleração longitudinal **nesse instante** (throttle ×
`enginePower` − drag − rolling, o mesmo termo que `stepVehicle` já calcula)
— não um stat autorado. Um carro a fundo + turbo soma mais do que um
carro a ralenti. Um carro a travar ou em ré puxa `carForce` para baixo.

`LAUNCH_CAR_SCALE` / `LAUNCH_HORIZ_SCALE` são constantes nomeadas (uma
knob de feel, não per-rampa). Testes afirmam a soma, não literais
espalhados.

Se `vertRaw <= 0` **ou** `horizRaw <= 0`, **não há launch**. O carro não
sai do chão. Ver §1b (ré sozinha).

Os bónus hot (§3) aplicam-se **depois** desta soma, e só se o launch
foi positivo nos dois eixos.

### 1b. Sem força positiva → a rampa ganha (ré sozinha)

Uma rampa de 45° **não se sobe** abaixo de 45% do `maxSpeed` do carro.
A regra geral (arcade, não real) é:

```
minClimbFrac = inclineDegrees / 100    // 45° → 0.45, 30° → 0.30, 15° → 0.15
```

Falhou o climb quando **qualquer** disto é verdade no ponto zero:

- `speedFrac < minClimbFrac` (a 45°, abaixo de 45% do máximo)
- `vertRaw <= 0` ou `horizRaw <= 0` (a soma não lança nos dois eixos)

No fail o carro **não voa**. Leva um impulso para trás ao longo do
heading (ré sozinha — a rampa empurra-o de volta para a reta):

```
rejectVelocity = scale(fromAngle(heading), -RAMP_REJECT_SPEED)
verticalVelocity = 0
height = 0
```

`RAMP_REJECT_SPEED` é uma constante (feel: o suficiente para se ler como
“escorregou para trás”, não um teleport). O input do jogador continua
válido no passo seguinte — se meter fundo outra vez, pode voltar a tentar.
Não é stun e não é dano. Hop (Space) não passa por esta porta.

### 2. “Velocidade normal + turbo” — o *hot approach*

`stats.maxSpeed` é a velocidade terminal **sem** turbo (a “normal”).
Turbo (+35%) pode passar disso. Isto só entra **depois** de o launch ter
sido positivo (§1). Um fail de climb nunca é “frio” nem “quente” — é ré.

```
hotApproach =
  forwardSpeed >= 0.85 * stats.maxSpeed
  AND turboRemaining > 0 no momento do launch
```

O “100%” é o tecto da *banda de compromisso* (“estás a fundo”), **não** um cap
que pune overspeed. Se o turbo já te pôs acima de `maxSpeed`, continuas hot.
Abaixo de 85% ou sem turbo a arder, mas ainda acima do `minClimbFrac`:
launch = base + soma do carro, **sem** os multiplicadores da tabela.

### 3. Ângulo da rampa é dado, não derivado

`RampZone` ganha `inclineDegrees: 15 | 30 | 45`.
`launchSpeed` é só a **base fixa** da soma (§1). O ângulo escolhe o
`minClimbFrac`, a **tabela de bónus** (se hot) e o desenho da laje.

| Ângulo | Sobe só a partir de | Se hot approach                | Aterragem                     |
| ------ | ------------------- | ------------------------------ | ----------------------------- |
| 45°    | 45% do `maxSpeed`   | +50% vertical, +25% horizontal | 1 s sem controlo + 4% de dano |
| 30°    | 30% do `maxSpeed`   | +10% vertical, +40% horizontal | limpa                         |
| 15°    | 15% do `maxSpeed`   | +10% vertical, +40% horizontal | limpa                         |

“Vertical” = pico de altura, não `verticalVelocity` em cru.
“Horizontal” = distância percorrida no plano enquanto voa.

Como `peak = v² / (2g)`, um +50% de altura pede
`verticalVelocity *= sqrt(1.50)`. Um +25% de alcance pede
`|velocity_xy| *= 1.25` no launch (airtime terrestre mudaria os dois eixos
ao mesmo tempo — não queremos isso).

30° e 15° partilham a mesma tabela de voo: a diferença é visual e de
compromisso (a 15° é mais fácil de apanhar a fundo; a 45° é o *big air*).

### 4. Turbo a meio do salto — segundo kick, uma vez

Se o jogador **consome** uma carga de turbo **já no ar** (`isAirborne` no
`resolveTurboCommand`):

- +5% vertical e +10% horizontal, **uma vez por voo**
- Empilha em cima do launch (multiplicativo): 45° hot + kick aéreo =
  V `× 1.50 × 1.05`, H `× 1.25 × 1.10`
- Vale também num launch frio — o turbo no ar é a recuperação arcade
- Não reaplica em cada frame enquanto o turbo está a arder
- Hop (Space) **não** recebe este kick

### 5. Aterragem dura só na 45° quente

Só quando o launch foi hot **e** a zona era 45°. Aterrar de 15°/30°, ou de
uma 45° fria, é silencioso.

- **1 s sem controlo:** novo timer `landingStunRemaining` em `RacerRuntime`.
  Enquanto `> 0`, o input do passo é `NEUTRAL_INPUT` (o carro mantém
  momentum; não congela, não faz spin de óleo). Não é `yawSpin` — óleo já
  é isso.
- **4% de dano:** constante `RAMP_LANDING_DAMAGE = 0.04` via
  `applyWeaponDamage` (armadura continua a contar — um tanque encolhe os
  ombros; um vidro sente). Não é impacto de parede (não há `impactSpeed`).
- Hop nunca paga esta taxa.

### 6. Trajetória fora da pista → cai, explode, volta depois da rampa

No ar as paredes já são skipped (excepção à decisão 19). Isso é o que
permite o arco sair da pista. A punição **não** é uma parede invisível
no ar — é o chão do lado de lá.

No instante da aterragem (`wasAirborne && !isAirborne`), se o launch
foi de rampa (`pendingRampFlight`) e

```
|lateralOffset| > track.halfWidth + track.shoulderWidth
```

o carro **cai lá fora e explode**:

- `integrity → 0` / `DESTROYED`, armadura ignorada (cair no vazio não é
  um toque — não passa por `applyWeaponDamage`)
- para onde caiu, `velocity = 0`, o `ExplosionEffect` já existente dispara
  no sítio do impacto (o mesmo path que mina / contacto fatal)
- `sitOutWreck` corre o timer normal (`RESPAWN_TIME_SECONDS`, 2 s)

Quando o timer acaba, **não** respawna no sítio da morte (o default de
`sitOutWreck`). Vai para a **linha a seguir à rampa**:

```
respawnDistance = wrap(zone.triggerDistance + zone.triggerLength)
```

Centro da pista, `lateralOffset = 0`, heading = tangente. A zona é
`distance < end`, portanto aterrar em `end` **não** relança. Guardar
`offTrackRespawnDistance` no runtime no momento do launch; limpar num
landing limpo. Hop (Space) não usa esta porta — um hop curto que
esfrega o berm continua offroad normal.

Aterrar no shoulder (`halfWidth < |offset| ≤ halfWidth + shoulderWidth`)
é ainda “na pista”: offroad, sem explode. Só o outro lado da parede é
o vazio.

### 7. O que o ângulo **não** muda

- `RAMP_GRAVITY` continua 40 para toda a gente
- Paredes e contacto no ar continuam skipped — o explode é na aterragem
- Sem animação de rolagem / pitch do sprite nesta tarefa
- Sem segundo eixo Z na spline — altura continua só no carro
- `sitOutWreck` no resto dos wrecks (mina, contacto) continua a
  respawnar no sítio da morte; só o void-da-rampa desvia a linha

---

## Thunder Basin — as três rampas

Manter as distâncias já medidas; só autorar o ângulo e, se preciso, retocar
`launchSpeed` para a laje 45° ler como rampa e não como lomba.

| Distância | Sítio              | Ângulo | Papel                                      |
| --------- | ------------------ | ------ | ------------------------------------------ |
| 200 / 12  | Reta de baixo      | 45°    | O salto da T-050. A fundo + turbo = voo; abaixo de 45% = ré |
| 680 / 10  | Saída do sweeper   | 30°    | Alcance; abaixo de 30% = ré                                 |
| 1180 / 10 | Approach do hairpin| 15°    | Quase um hop; abaixo de 15% = ré                            |

O outcome da T-050 não muda: o owner conduz a reta de baixo, vê a rampa,
salta, aterra no asfalto. O screenshot (decisão 25) tem de mostrar o carro
**no ar**, sombra no chão — de preferência o salto 45° quente, que é o único
que se lê como “grande”.

---

## O que falta (trabalho)

### A. Dados e tabela de bónus

1. `RampZone.inclineDegrees: 15 | 30 | 45` (obrigatório em cada zona).
2. Novo módulo `src/domain/track/RampLaunch.ts` (puro):
   - `carForceAtContact(state, stats, command, turboActive)` — a soma
     `speedFrac + accelFrac + turboTerm` no ponto zero
   - `resolveRampContact(...)` → `{ kind: 'launch', state } | { kind: 'reject', state }`
   - `isHotApproach(forwardSpeed, maxSpeed, turboActive)`
   - `rampArcadeBonus(incline, hot): { vertical, horizontal }`
   - `applyAirTurboKick(state) → VehicleState` (o +5% / +10%)
   - Constantes nomeadas: `LAUNCH_CAR_SCALE`, `LAUNCH_HORIZ_SCALE`,
     `RAMP_REJECT_SPEED`, percentagens hot, `RAMP_LANDING_DAMAGE` —
     testes afirmam os números do owner, não literais espalhados.
3. `OnTrackStep` deixa de fazer `verticalVelocity: zone.launchSpeed`.
   Passa a chamar `resolveRampContact` com `command` + `turboActive`.
   Launch positivo → voo. Reject → velocity invertida, `height` 0, não
   entra em `AIRBORNE_SURFACE` nesse passo.
4. `thunder-basin.track.ts` — acrescentar `inclineDegrees` nas 3 zonas.

### B. Turbo aéreo e stun / dano

5. `RacerRuntime`: `landingStunRemaining`, `airTurboKicked`,
   `pendingRampFlight`, `pendingHardLanding`, `offTrackRespawnDistance`
   (reset no landing limpo / no explode).
6. `RaceField.resolveTurboCommand`: se `isAirborne` e ainda não kicked,
   aplicar `applyAirTurboKick` e marcar o flag.
7. `RaceField` no step: se `landingStunRemaining > 0`, substituir o command
   por `NEUTRAL_INPUT` e decrementar. Armas/hop/turbo também bloqueados
   no stun (o `frozen` local já existe para DESTROYED — reutilizar o
   padrão, não inventar um segundo freeze).
8. Detetar aterragem: `wasAirborne && !isAirborne(next)`.
   - Fora das paredes + `pendingRampFlight` → DESTROYED no sítio,
     `offTrackRespawnDistance` já gravado no launch; `sitOutWreck` usa
     essa distância em vez de `racer.distance`.
   - Senão, se o launch tinha sido 45° hot → dano 4% + stun 1 s.

### C. Desenho (mínimo — a física já projecta altura)

9. `drawRockRamp` usa `inclineDegrees` para a cara da laje (45° mais alta /
   mais íngreme que 15°). O pico visual continua alinhado com
   `rampPeakHeight` **terrestre** — a laje é o trampolim, não o arco do
   voo arcade.
10. Não tocar em `VehicleView` além do que já está certo.

### D. Testes (hoje o código aéreo não tem cobertura de rampa)

11. `tests/domain/Airborne.test.ts` — pico e airtime analíticos vs
    `integrateAirborne` passo-a-passo (a linha de base terrestre).
12. `tests/domain/RampLaunch.test.ts`:
    - carro a fundo + turbo lança mais alto/longe do que o mesmo carro a
      60% sem turbo (a soma no ponto zero muda o impulso; a base da zona
      é igual)
    - 45° abaixo de 45% do `maxSpeed` → `kind: 'reject'`, velocity para
      trás, `height === 0`
    - 45° com força cuja soma dá `vertRaw` ou `horizRaw` ≤ 0 → reject
    - 30° abaixo de 30% / 15° abaixo de 15% → reject
    - acima do mínimo, sem hot → launch = base + soma, bónus 1.0 / 1.0
    - hot 45° → 1.50 V / 1.25 H em cima da soma
    - hot 15° e 30° → 1.10 V / 1.40 H em cima da soma
    - abaixo de 85% com turbo, mas acima do mínimo → frio (soma, sem tabela)
    - ≥ 85% sem turbo → frio
    - kick aéreo uma vez; segundo turbo no mesmo voo não acumula
    - stack 45° hot × kick aéreo
13. `OnTrackStep` — entra na zona a fundo, sai com `height > 0`; entra
    rastejando numa 45°, sai grounded a andar para trás; não relança no
    mesmo voo; paredes skipped só no ar.
14. `RaceField` — aterragem 45° hot: integrity cai ~4% (antes da armadura)
    e input é neutro durante 1 s; 15°/30° e hop não pagam.
15. `RaceField` — aterragem de rampa com `|lateralOffset|` past the wall:
    `DESTROYED` no sítio; após o timer, posição = `frameAt(triggerDistance
    + triggerLength)`, `lateralOffset === 0`; hop e landing no shoulder
    não explodem. `sitOutWreck` de uma mina continua a respawnar onde morreu.
16. Thunder Basin: as 3 zonas existem, ângulos 45/30/15.

### E. Fechar a tarefa

17. Screenshot de um carro no ar na reta de baixo (decisão 25). Não
    confiar em `window.game` / object state.
18. `WORKLOG` T-050 → `done` só depois do screenshot.
19. Typecheck + suíte verde. Sem animação de rolagem neste fecho.

---

## Ordem de implementação

1. Soma + reject + testes (A / 11–12) — o feel fica locked
2. `resolveRampContact` em `OnTrackStep` + `turboActive` no caller (A.3)
3. Kick aéreo + hard landing + void-landing em `RaceField` (B)
4. Ângulos em Thunder Basin + laje mais íngreme na 45° (C / A.4)
5. Screenshot na reta de baixo (E) — e um segundo take a rastejar na 45°
   a ver a ré, se o primeiro take for o voo quente
6. Ledger

Não reabrir `integrateAirborne`, `AIRBORNE_SURFACE`, skip de paredes, nem
o hop. A gravidade terrestre é o chão do ar; o launch é base da zona +
carro no ponto zero; abaixo do mínimo a rampa manda-te para trás; um arco
para o outro lado da parede explode e volta na linha a seguir à rampa.
