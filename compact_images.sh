#!/usr/bin/env bash
# Compacta PNGs com backup em ./_originais.
# PNG8 só fica se o RMSE normalizado for baixo; senão tenta lossless; senão rollback.
# Rollback total: ./restore_images.sh
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT_DIR"

BACKUP="_originais"
TARGET="public/assets"
MAX_RMSE="0.01"
DRY_RUN=0
FORCE=0

usage() {
  cat <<'EOF'
Uso: ./compact_images.sh [opções] [PATH]

  --root PATH      pasta ou PNG alvo (default: public/assets)
  --max-rmse N     teto de RMSE normalizado para PNG8 (default: 0.01)
  -n, --dry-run    mostra o que faria, não grava
  -f, --force      reprocessa a partir do original em _originais
  -h, --help
  PATH             atalho para --root PATH

PNG8 (256 cores) só entra se ficar menor e com RMSE <= teto.
Caso contrário tenta compressão lossless. Sem ganho, o arquivo fica como está.
Heroes (*_hero.png) não são tocados. Originais vão para ./_originais/
Rollback: ./restore_images.sh
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --root)
      TARGET="${2:?--root precisa de uma pasta ou PNG}"
      TARGET="${TARGET#./}"
      shift 2
      ;;
    --max-rmse)
      MAX_RMSE="${2:?--max-rmse precisa de um número}"
      shift 2
      ;;
    -n|--dry-run) DRY_RUN=1; shift ;;
    -f|--force) FORCE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*)
      echo "Opção desconhecida: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      TARGET="${1#./}"
      shift
      ;;
  esac
done

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick (magick) não encontrado." >&2
  exit 1
fi

if [[ ! -e "$TARGET" ]]; then
  echo "Alvo não existe: $TARGET" >&2
  exit 1
fi

file_size() {
  wc -c < "$1" | tr -d ' '
}

human() {
  awk -v b="$1" 'BEGIN {
    split("B K M G", u)
    i = 1
    while (b >= 1024 && i < 4) { b /= 1024; i++ }
    if (i == 1) printf "%dB", b
    else printf "%.1f%s", b, u[i]
  }'
}

# Magick compare devolve 1 quando as imagens diferem — isso não é erro.
norm_rmse() {
  local orig=$1 cand=$2 out status
  set +e
  out=$(magick compare -metric RMSE "$orig" "$cand" null: 2>&1)
  status=$?
  set -e
  if [[ $status -gt 1 ]]; then
    echo "9"
    return
  fi
  local norm
  norm=$(printf '%s\n' "$out" | sed -n 's/.*(\([0-9.][0-9.eE+-]*\)).*/\1/p' | tail -1)
  if [[ -z "$norm" ]]; then
    echo "9"
    return
  fi
  printf '%s\n' "$norm"
}

rmse_ok() {
  awk -v a="$1" -v t="$2" 'BEGIN { exit !(a + 0 <= t + 0) }'
}

ok=0
skip=0
rollback=0
err=0
bytes_before=0
bytes_after=0

WORK=$(mktemp -d "${TMPDIR:-/tmp}/compact-png.XXXXXX")
trap 'rm -rf "$WORK"' EXIT

echo "Alvo: $TARGET   max RMSE: $MAX_RMSE   dry-run: $DRY_RUN"

while IFS= read -r -d '' f; do
  rel="${f#./}"

  case "$(basename "$rel")" in
    *_hero.png)
      echo "SKIP hero: $rel"
      skip=$((skip + 1))
      continue
      ;;
  esac

  orig_size=$(file_size "$f")
  backup_path="$BACKUP/$rel"
  source_path=$f

  if [[ -f "$backup_path" ]]; then
    if [[ $FORCE -eq 1 ]]; then
      source_path=$backup_path
    elif cmp -s "$backup_path" "$f"; then
      source_path=$backup_path
    else
      echo "SKIP já compactado: $rel"
      skip=$((skip + 1))
      bytes_before=$((bytes_before + orig_size))
      bytes_after=$((bytes_after + orig_size))
      continue
    fi
  fi

  png8="$WORK/png8.png"
  lossless="$WORK/lossless.png"
  rm -f "$png8" "$lossless"

  if ! magick "$source_path" -strip -colors 256 "PNG8:$png8" 2>/dev/null; then
    rm -f "$png8"
  fi
  if ! magick "$source_path" -strip \
      -define png:compression-level=9 \
      -define png:compression-filter=5 \
      "$lossless" 2>/dev/null; then
    rm -f "$lossless"
  fi

  winner=""
  winner_size=$orig_size
  winner_kind=""
  png8_refused=0
  png8_rmse=""

  if [[ -f "$lossless" ]]; then
    lossless_size=$(file_size "$lossless")
    if [[ "$lossless_size" -gt 0 && "$lossless_size" -lt "$winner_size" ]]; then
      winner=$lossless
      winner_size=$lossless_size
      winner_kind="lossless"
    fi
  fi

  if [[ -f "$png8" ]]; then
    png8_size=$(file_size "$png8")
    png8_rmse=$(norm_rmse "$source_path" "$png8")
    if [[ "$png8_size" -gt 0 && "$png8_size" -lt "$orig_size" ]] && rmse_ok "$png8_rmse" "$MAX_RMSE"; then
      if [[ "$png8_size" -lt "$winner_size" ]]; then
        winner=$png8
        winner_size=$png8_size
        winner_kind="png8 rmse=$png8_rmse"
      fi
    elif [[ "$png8_size" -gt 0 && "$png8_size" -lt "$orig_size" ]]; then
      png8_refused=1
    fi
  fi

  bytes_before=$((bytes_before + orig_size))

  if [[ -z "$winner" ]]; then
    if [[ $png8_refused -eq 1 ]]; then
      echo "ROLLBACK qualidade: $rel  (png8 rmse=$png8_rmse > $MAX_RMSE)"
      rollback=$((rollback + 1))
    else
      echo "SKIP sem ganho: $rel"
      skip=$((skip + 1))
    fi
    bytes_after=$((bytes_after + orig_size))
    continue
  fi

  saved=$((orig_size - winner_size))
  extra=""
  if [[ $png8_refused -eq 1 && "$winner_kind" == lossless ]]; then
    extra="  (png8 recusado rmse=$png8_rmse)"
  fi
  echo "OK $winner_kind: $rel  $(human "$orig_size") → $(human "$winner_size")  (−$(human "$saved"))$extra"

  if [[ $DRY_RUN -eq 1 ]]; then
    ok=$((ok + 1))
    bytes_after=$((bytes_after + winner_size))
    continue
  fi

  mkdir -p "$(dirname "$backup_path")"
  if [[ ! -f "$backup_path" ]]; then
    cp -p "$source_path" "$backup_path"
  elif [[ $FORCE -eq 1 && "$source_path" != "$backup_path" ]]; then
    cp -p "$source_path" "$backup_path"
  fi

  if cp -p "$winner" "$f"; then
    ok=$((ok + 1))
    bytes_after=$((bytes_after + winner_size))
  else
    echo "ERRO ao gravar: $rel (original restaurado)"
    cp -p "$backup_path" "$f" || true
    err=$((err + 1))
    bytes_after=$((bytes_after + orig_size))
  fi
done < <(find "$TARGET" -type f -iname '*.png' \
  -not -path "*/$BACKUP/*" \
  -not -path '*/node_modules/*' \
  -not -path '*/dist/*' \
  -not -path '*/.git/*' \
  -not -path '*/.preview/*' \
  -not -path '*/.tmp/*' \
  -not -path '*/graphify-out/*' \
  -print0)

echo
echo "Concluído."
echo "  ok:       $ok"
echo "  skip:     $skip"
echo "  rollback: $rollback  (qualidade PNG8)"
echo "  erro:     $err"
echo "  tamanho:  $(human "$bytes_before") → $(human "$bytes_after")"
if [[ $DRY_RUN -eq 1 ]]; then
  echo "  dry-run:  nada foi gravado"
else
  echo "  backup:   ./$BACKUP"
  echo "  rollback: ./restore_images.sh"
fi
