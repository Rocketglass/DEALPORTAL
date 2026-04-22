#!/usr/bin/env bash
#
# Bundles every numbered migration under supabase/migrations/ into a single
# ordered SQL file. Paste the output into the Supabase SQL editor of a fresh
# project to provision the schema end-to-end.
#
# Usage:
#   ./scripts/bundle-migrations.sh                    # writes supabase/bundled-migrations.sql
#   ./scripts/bundle-migrations.sh /tmp/staging.sql   # writes to a custom path

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
migrations_dir="$repo_root/supabase/migrations"
output_path="${1:-$repo_root/supabase/bundled-migrations.sql}"

if [[ ! -d "$migrations_dir" ]]; then
  echo "error: $migrations_dir does not exist" >&2
  exit 1
fi

# shellcheck disable=SC2207
files=($(ls "$migrations_dir" | grep -E '^[0-9]+_.*\.sql$' | sort))
if [[ ${#files[@]} -eq 0 ]]; then
  echo "error: no numbered .sql migrations found in $migrations_dir" >&2
  exit 1
fi

{
  echo "-- ============================================================"
  echo "-- Rocket Realty Portal — bundled migrations"
  echo "-- Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "-- Files: ${files[0]} through ${files[${#files[@]}-1]} (${#files[@]} total)"
  echo "-- Apply to a fresh Supabase project via the SQL editor."
  echo "-- ============================================================"
  echo
  for f in "${files[@]}"; do
    echo
    echo "-- ============================================================"
    echo "-- $f"
    echo "-- ============================================================"
    cat "$migrations_dir/$f"
  done
} > "$output_path"

line_count=$(wc -l < "$output_path")
echo "wrote $output_path (${line_count} lines, ${#files[@]} migrations)"
