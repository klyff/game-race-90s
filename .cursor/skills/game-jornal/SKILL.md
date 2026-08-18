---
name: game-jornal
description: >-
  Writes a 6-line daily JOURNAL of what changed since the last iteration.
  Use when the user asks for jornal, journal, o que tem de novo, daily
  summary, or when coordinating a session close.
---

# Game jornal

Conta o dia. Seis linhas. O que é novo desde a última entrada, não a história do jogo.

## Quando

Pedido de jornal / journal / “o que tem de novo” / fecho de sessão. Também depois de um bloco grande de trabalho, se o humano pedir o SUMMARY do dia.

## Onde

- Produto (10 linhas, estável): `SUMMARY.md`
- Dia a dia (6 linhas, acresce): `JOURNAL.md`
- Livro-razão longo: `WORKLOG.md` — não copies dali. Lê só o último bloco se precisares de contexto.

## Como medir “desde a última iteração”

1. Lê a **última entrada** de `JOURNAL.md` (data + commit âncora).
2. Se o ficheiro não existir, a âncora é o último commit em `main` e a data de hoje.
3. Corre em paralelo:
   - `git log --oneline <âncora>..HEAD`
   - `git diff --stat <âncora>`
   - `git status -sb` (untracked que importa: `public/assets/`, `src/`, `tests/`, `tools/`)
4. Ignora ruído: `graphify-out/`, `.preview/`, lockfiles, artefactos de build.

## Formato (obrigatório)

Acrescenta no topo de `JOURNAL.md` (entradas novas em cima):

```markdown
## YYYY-MM-DD — <uma frase do dia>

Âncora: `<hash curto>` <assunto do commit>
<linha 1>
<linha 2>
<linha 3>
<linha 4>
<linha 5>
<linha 6>
```

Regras:

- **Exactamente 6 linhas** no corpo (além do heading e da âncora).
- Português. Frases curtas. Verbos no que chegou, não no que se planeia.
- Uma novidade por linha. Sem bullet de tarefa, sem “WIP”, sem lista de ficheiros.
- Não inventes. Se o diff for só sprites, o jornal é sobre sprites.
- Não reescrevas entradas antigas.
- Não commits o jornal a menos que o humano peça.

## Depois de escrever

Mostra as 6 linhas no chat. Não cole o `SUMMARY.md` outra vez salvo o humano pedir os dois.
