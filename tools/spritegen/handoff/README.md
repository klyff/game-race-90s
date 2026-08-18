# Handoff — modelo X → tira de relógio

Uma pasta por carro. Sem `IDENTITY.md` + `refs/hero.png` o agente não desenha.

```
handoff/{carId}/
  IDENTITY.md
  refs/hero.png
  refs/front.png          # opcional
  refs/side.png           # opcional
  refs/rear.png           # opcional
  refs/identity-sheet.png # opcional, identidade só — não é tabela de ângulos
```

Cursor: [`.cursor/skills/sprite-strip/SKILL.md`](../../../.cursor/skills/sprite-strip/SKILL.md).
Prompt colável (só desenho): [`.cursor/skills/iso-car-strip/CLAUDE_PROMPT.md`](../../../.cursor/skills/iso-car-strip/CLAUDE_PROMPT.md).

Piloto: [`car-1`](car-1/). O Claude Code desenha; este repo só empacota depois do QA.

```bash
npm run gen:qa-strip -- car-1
npm run gen:pack-redrawn -- car-1
# só depois da corrida de teste:
npm run gen:pack-redrawn -- car-1 --install
```
