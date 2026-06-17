#!/usr/bin/env bash
set -euo pipefail

KEEP_COUNT=5
ORG="varaperformance"
PACKAGES=("varaperformance-web" "varaperformance-backend" "varaperformance-worker")

for pkg in "${PACKAGES[@]}"; do
  echo "=== Processing $pkg ==="

  # Fetch ALL version data in one paginated call — collect as a single JSON array
  all_data=$(gh api --paginate "orgs/$ORG/packages/container/$pkg/versions" --jq '.[]' | jq -s '.')
  total=$(echo "$all_data" | jq 'length')
  echo "Total versions: $total"

  # Get IDs of the 5 most recent TAGGED versions
  keep_tagged=$(echo "$all_data" | jq -r '
    [.[] | select(.metadata.container.tags | length > 0)]
    | sort_by(.created_at) | reverse
    | .[0:'"$KEEP_COUNT"']
    | .[].id
  ')
  echo "Keeping tagged: $(echo $keep_tagged | tr '\n' ' ')"

  # Get the minute-prefix timestamps of kept versions
  keep_minutes=$(echo "$all_data" | jq -r --argjson ids "$(echo "$keep_tagged" | jq -R -s 'split("\n") | map(select(length > 0) | tonumber)')" '
    [.[] | select(.id as $id | $ids | index($id))]
    | .[].created_at
    | .[0:16]
  ' | sort -u)

  echo "Keep minutes: $(echo $keep_minutes | tr '\n' ' ')"

  # Build the list of IDs to delete:
  # - NOT one of the 5 kept tagged versions
  # - NOT created in the same minute as a kept version (associated layers)
  delete_ids=$(echo "$all_data" | jq -r --argjson ids "$(echo "$keep_tagged" | jq -R -s 'split("\n") | map(select(length > 0) | tonumber)')" --argjson mins "$(echo "$keep_minutes" | jq -R -s 'split("\n") | map(select(length > 0))')" '
    .[]
    | select(
        (.id as $id | $ids | index($id) | not)
        and
        (.created_at[0:16] as $m | $mins | index($m) | not)
      )
    | .id
  ')

  delete_count=$(echo "$delete_ids" | grep -c . || true)
  echo "Will delete: $delete_count versions"

  # Delete each version
  deleted=0
  for id in $delete_ids; do
    if gh api --method DELETE "orgs/$ORG/packages/container/$pkg/versions/$id" >/dev/null 2>&1; then
      deleted=$((deleted + 1))
      # Progress every 25
      if (( deleted % 25 == 0 )); then
        echo "  ...deleted $deleted/$delete_count"
      fi
    else
      echo "  FAILED: $id"
    fi
  done

  echo "Deleted: $deleted | Kept: $((total - deleted))"
  echo ""
done

echo "Done!"
