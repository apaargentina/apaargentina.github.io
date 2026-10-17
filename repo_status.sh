#!/usr/bin/env bash
#
# repo_to_markdown.sh — dump a repository into a single Markdown file.
#
# Usage:
#   ./repo_to_markdown.sh [REPO_DIR] [OUTPUT_FILE]
#
#   REPO_DIR     Folder to scan                (default: current directory)
#   OUTPUT_FILE  Markdown file to write        (default: repo_status.md)
#                A relative name is created inside REPO_DIR.
#
# Output layout:
#   ## Repository Tree        -> code block with the tree
#   ## `path/to/file`         -> code block with that file's contents
#   ...one section per file
#
set -euo pipefail

REPO_DIR="${1:-.}"
OUTPUT_NAME="${2:-repo_status.md}"
MAX_BYTES=$((1024 * 1024))   # files bigger than this are listed but not dumped

# ---- Edit these lists to taste ------------------------------------------
# Directories are excluded at ANY depth; files are matched by name at any depth.
EXCLUDE_DIRS=(".git" "_site" "node_modules" ".jekyll-cache" ".sass-cache" ".bundle" "vendor")
EXCLUDE_FILES=(".DS_Store" "Thumbs.db")

# Files that stay in the tree and keep their section, but WITHOUT their contents.
# Glob patterns matched against the path from the repo root ("*" also matches "/").
OMIT_CONTENT=("assets/geo/*" "*.geojson")
# --------------------------------------------------------------------------

[ -d "$REPO_DIR" ] || { echo "Error: '$REPO_DIR' is not a directory" >&2; exit 1; }
cd "$REPO_DIR"

# Never ingest the output file or this script itself
EXCLUDE_FILES+=("$(basename "$OUTPUT_NAME")" "$(basename "$0")")

# Work in temp files OUTSIDE the repo, and only move the result into place at
# the very end. Writing straight into a file that lives inside the scanned
# folder lets the scan read its own growing output.
TMP_DIR="${TMPDIR:-/tmp}"
TMP_OUT="$(mktemp "$TMP_DIR/repo_md_out.XXXXXX")"
FILE_LIST="$(mktemp "$TMP_DIR/repo_md_list.XXXXXX")"
trap 'rm -f "$TMP_OUT" "$FILE_LIST"' EXIT

# ---- 1. Build the file list once (the tree and the sections both use it) --
prune_expr=(-name "${EXCLUDE_DIRS[0]}")
for d in "${EXCLUDE_DIRS[@]:1}"; do prune_expr+=(-o -name "$d"); done

skip_expr=()
for f in "${EXCLUDE_FILES[@]}"; do skip_expr+=(! -name "$f"); done

find . -type d \( "${prune_expr[@]}" \) -prune -o -type f "${skip_expr[@]}" -print \
  | sed 's|^\./||' | LC_ALL=C sort > "$FILE_LIST"

# ---- 2. Tree --------------------------------------------------------------
print_tree() {
  if command -v tree >/dev/null 2>&1 && tree --help 2>&1 | grep -q -- '--fromfile'; then
    tree --fromfile --noreport . < "$FILE_LIST"
  else
    # Fallback when `tree` is missing or too old: simple indented listing
    echo "."
    awk -F/ '
      function indent(n,   s, i) { s = ""; for (i = 0; i < n; i++) s = s "  "; return s }
      {
        path = ""
        for (i = 1; i <= NF; i++) {
          path = path (i > 1 ? "/" : "") $i
          if (i < NF) {
            if (!(path in seen)) { seen[path] = 1; print indent(i) $i "/" }
          } else {
            print indent(i) $i
          }
        }
      }' "$FILE_LIST"
  fi
}

{
  echo "## Repository Tree"
  echo
  echo '```'
  print_tree
  echo '```'
  echo
} > "$TMP_OUT"

# ---- 3. One section per file ----------------------------------------------
lang_for() {
  case "$1" in
    md|markdown) echo "markdown" ;;
    yml|yaml)    echo "yaml" ;;
    html|htm)    echo "html" ;;
    css|scss)    echo "css" ;;
    js)          echo "javascript" ;;
    json)        echo "json" ;;
    rb)          echo "ruby" ;;
    sh|bash)     echo "bash" ;;
    py)          echo "python" ;;
    csv)         echo "csv" ;;
    svg|xml)     echo "xml" ;;
    *)           echo "" ;;
  esac
}

count=0
while IFS= read -r f; do
  count=$((count + 1))
  {
    printf '## `%s`\n\n' "$f"

    if [ ! -s "$f" ]; then
      echo "_Empty file._"
      echo
      continue
    fi

    size="$(wc -c < "$f" | tr -d ' ')"

    omit=0
    for pat in "${OMIT_CONTENT[@]}"; do
      case "$f" in $pat) omit=1; break ;; esac
    done
    if [ "$omit" -eq 1 ]; then
      echo "_Contents omitted ($size bytes)._"
      echo
      continue
    fi

    if [ "$size" -gt "$MAX_BYTES" ]; then
      echo "_Skipped: file is $size bytes (limit is $MAX_BYTES)._"
      echo
      continue
    fi

    if ! LC_ALL=C grep -qI '' "$f"; then
      echo "_Skipped: binary file._"
      echo
      continue
    fi

    # Use a code fence longer than any run of backticks inside the file,
    # so files that contain ``` (like READMEs) can't break out of the block.
    longest="$(grep -o '`\{1,\}' "$f" 2>/dev/null | awk '{ if (length($0) > m) m = length($0) } END { print m + 0 }' || true)"
    fence_len=3
    if [ "${longest:-0}" -ge 3 ]; then fence_len=$((longest + 1)); fi
    fence="$(printf '%*s' "$fence_len" '' | tr ' ' '`')"

    ext=""
    case "$f" in *.*) ext="$(printf '%s' "${f##*.}" | tr '[:upper:]' '[:lower:]')" ;; esac

    printf '%s%s\n' "$fence" "$(lang_for "$ext")"
    cat "$f"
    # make sure the closing fence starts on its own line
    if [ -n "$(tail -c1 "$f")" ]; then echo; fi
    printf '%s\n\n' "$fence"
  } >> "$TMP_OUT"
done < "$FILE_LIST"

# ---- 4. Move into place -----------------------------------------------------
chmod 644 "$TMP_OUT"
mv "$TMP_OUT" "$OUTPUT_NAME"

echo "Done: $count files -> $OUTPUT_NAME ($(wc -c < "$OUTPUT_NAME" | tr -d ' ') bytes)"