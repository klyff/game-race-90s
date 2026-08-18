#!/usr/bin/env bash
# Devolve os PNGs originais de ./_originais para o lugar.
# Sem filtro restaura tudo. Com caminho, só aquele ficheiro ou pasta.
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT_DIR"

BACKUP="_originais"
DRY_RUN=0
FILTER=""

usage() {
  cat <<'EOF'
Uso: ./restore_images.sh [opções] [caminho]

  -n, --dry-run    mostra o que restauraria, não grava
  -h, --help

Exemplos:
  ./restore_images.sh
  ./restore_images.sh public/assets/cards
  ./restore_images.sh -n public/assets/ui/pub_1.png
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*)
      echo "Opção desconhecida: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      if [[ -n "$FILTER" ]]; then
        echo "Só um caminho de filtro é aceite." >&2
        exit 2
      fi
      FILTER="${1#./}"
      shift
      ;;
  esac
done

if [[ ! -d "$BACKUP" ]]; then
  echo "Pasta $BACKUP não encontrada. Nada para restaurar."
  exit 1
fi

matches_filter() {
  local rel=$1
  [[ -z "$FILTER" ]] && return 0
  case "$rel" in
    "$FILTER"|"$FILTER"/*) return 0 ;;
    *) return 1 ;;
  esac
}

ok=0
skip=0
err=0

echo "Backup: ./$BACKUP   filtro: ${FILTER:-tudo}   dry-run: $DRY_RUN"

while IFS= read -r -d '' f; do
  rel="${f#"$BACKUP"/}"

  if ! matches_filter "$rel"; then
    skip=$((skip + 1))
    continue
  fi

  dest=$rel
  mkdir -p "$(dirname "$dest")"

  if [[ $DRY_RUN -eq 1 ]]; then
    echo "RESTAURARIA: $rel"
    ok=$((ok + 1))
    continue
  fi

  if mv -f "$f" "$dest"; then
    echo "Restaurado: $rel"
    ok=$((ok + 1))
  else
    echo "ERRO ao restaurar: $rel"
    err=$((err + 1))
  fi
done < <(find "$BACKUP" -type f -iname '*.png' -print0)

if [[ $DRY_RUN -eq 0 ]]; then
  find "$BACKUP" -type d -empty -delete 2>/dev/null || true
fi

echo
echo "Concluído."
echo "  restaurados: $ok"
echo "  ignorados:   $skip"
echo "  erros:       $err"
if [[ $DRY_RUN -eq 1 ]]; then
  echo "  dry-run:     nada foi movido"
elif [[ ! -d "$BACKUP" ]]; then
  echo "  pasta $BACKUP removida (vazia)"
elif [[ -n "$FILTER" ]]; then
  echo "  resto do backup permanece em ./$BACKUP"
fi

if [[ $err -gt 0 ]]; then
  exit 1
fi
