# Esta pasta é o pack inteiro

Copia a pasta para a outra máquina.
Abre o Claude Code **nesta pasta como projecto** (não no jogo, não em `phisics-1`).
Cola `COLA-ISTO.md`.

Se o Claude abrir `IsoProjection` ou `geometry.ts`, está no sítio errado: fecha e abre só esta pasta.
Se o Claude correr `sips` / `rsvg` / `command -v`: essa sessão **não tem image gen**. Para. Não serve. Abre o pack no Cursor (aqui), que tem gerar imagem.

| Ficheiro | O que é | O que fazes |
| --- | --- | --- |
| `COLA-ISTO.md` | O pedido | **Colas** no chat. É a única coisa que escreves. |
| `REGRAS.md` | Como desenhar | O Claude **lê**. |
| `CLOCK.md` | Os 32 ângulos | O Claude **lê**. |
| `IDENTITY.md` | Este carro | O Claude **lê**. |
| `hero.png` | O modelo | É o carro. |
| `estilo.png` | Qualidade 16-bit | Só o estilo, não o homem. |
| `identity-sheet.png` | Tira velha | Só contar peças. Poses mentem. |

O Claude grava **aqui ao lado**, em `out/`:
`00.png` … `31.png` + `hq-right.png` + `hq-left.png`.

Quando `out/` estiver cheia, traz essa pasta de volta para o repo do jogo e corre lá:

```bash
cp -R out/. tools/spritegen/redrawn/car-1/
npm run gen:qa-strip -- car-1
npm run gen:pack-redrawn -- car-1
```
