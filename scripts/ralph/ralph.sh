#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Usage: ./ralph.sh [--tool amp|claude|codex] [max_iterations]

set -e

# Parse arguments
TOOL="amp"  # Default to amp for backwards compatibility
MAX_ITERATIONS=50

while [[ $# -gt 0 ]]; do
  case $1 in
    --tool)
      TOOL="$2"
      shift 2
      ;;
    --tool=*)
      TOOL="${1#*=}"
      shift
      ;;
    *)
      # Assume it's max_iterations if it's a number
      if [[ "$1" =~ ^[0-9]+$ ]]; then
        MAX_ITERATIONS="$1"
      fi
      shift
      ;;
  esac
done

# Validate tool choice
if [[ "$TOOL" != "amp" && "$TOOL" != "claude" && "$TOOL" != "codex" ]]; then
  echo "Error: Invalid tool '$TOOL'. Must be 'amp', 'claude', or 'codex'."
  exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

echo "Starting Ralph - Tool: $TOOL - Max iterations: $MAX_ITERATIONS"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "==============================================================="
  echo "  Ralph Iteration $i of $MAX_ITERATIONS ($TOOL)"
  echo "==============================================================="

  # Run the selected tool with the ralph prompt
  if [[ "$TOOL" == "amp" ]]; then
    OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" | amp --dangerously-allow-all 2>&1 | tee /dev/stderr) || true
  elif [[ "$TOOL" == "codex" ]]; then
    OUTPUT=$(codex exec --full-auto "$(cat "$SCRIPT_DIR/prompt.md")" 2>&1 | tee /dev/stderr) || true
  else
    # Claude Code: stream JSON events so we can display thinking/tool calls in real-time
    TMPFILE=$(mktemp)
    claude --dangerously-skip-permissions --print --verbose \
      --output-format stream-json --max-turns 50 \
      < "$SCRIPT_DIR/CLAUDE.md" \
      | tee "$TMPFILE" \
      | jq --unbuffered -r '
        if .type == "assistant" then
          .message.content[] |
          if .type == "thinking" then
            "[thinking] " + .thinking + "\n"
          elif .type == "text" then
            .text + "\n"
          elif .type == "tool_use" then
            "[tool] " + .name + "(" + (.input | keys | join(", ")) + ")\n"
          else empty end
        else empty end
      ' || true
    # Extract result event for summary and COMPLETE check
    RESULT_JSON=$(jq -r 'select(.type == "result")' "$TMPFILE" 2>/dev/null) || true
    OUTPUT=$(echo "$RESULT_JSON" | jq -r '.result // ""' 2>/dev/null) || true

    # Print iteration summary (matching TS version)
    if [ -n "$RESULT_JSON" ]; then
      eval "$(echo "$RESULT_JSON" | jq -r '
        .usage as $u |
        ($u.input_tokens + $u.cache_creation_input_tokens + $u.cache_read_input_tokens) as $prompt |
        ($u.output_tokens // 0) as $out |
        (.modelUsage | to_entries | first // {value:{contextWindow:0}}).value.contextWindow as $ctx |
        @sh "R_DUR_MS=\(.duration_ms) R_COST=\(.total_cost_usd * 100 | floor / 100) R_TOTAL=\($prompt + $out) R_IN=\($prompt) R_OUT=\($out) R_CTX=\($ctx)"
      ' 2>/dev/null)" || true

      if [ -n "$R_DUR_MS" ]; then
        # Format duration
        R_SECS=$(( R_DUR_MS / 1000 ))
        R_MIN=$(( R_SECS / 60 ))
        R_SEC=$(( R_SECS % 60 ))
        if [ "$R_MIN" -eq 0 ]; then R_DUR="${R_SEC}s"
        elif [ "$R_SEC" -eq 0 ]; then R_DUR="${R_MIN}m"
        else R_DUR="${R_MIN}m ${R_SEC}s"; fi

        # Format context window label
        if [ "$R_CTX" -ge 1000000 ]; then
          R_CTX_LABEL="$(echo "scale=1; $R_CTX / 1000000" | bc)M"
        elif [ "$R_CTX" -ge 1000 ]; then
          R_CTX_LABEL="$(( R_CTX / 1000 ))K"
        else
          R_CTX_LABEL="$R_CTX"
        fi

        # Context percentage
        if [ "$R_CTX" -gt 0 ]; then
          R_PCT=$(echo "scale=1; $R_IN * 100 / $R_CTX" | bc)
        else
          R_PCT="0"
        fi

        # Format token counts with commas
        fmt_num() { printf "%'d" "$1"; }

        W=78
        echo ""
        printf '╔'; printf '═%.0s' $(seq 2 $((W-1))); printf '╗\n'
        printf "║ %-$((W-3))s║\n" "✨ Iteration $i/$MAX_ITERATIONS"
        printf '╟'; printf '─%.0s' $(seq 2 $((W-1))); printf '╢\n'
        printf "║  %-24s%-$((W-28))s║\n" "Duration" "$R_DUR"
        printf "║  %-24s%-$((W-28))s║\n" "Cost" "\$$R_COST"
        printf "║  %-24s%-$((W-28))s║\n" "Tokens this iteration" "$(fmt_num $R_TOTAL)"
        printf "║    %-22s%-$((W-28))s║\n" "Input" "$(fmt_num $R_IN)"
        printf "║    %-22s%-$((W-28))s║\n" "Output" "$(fmt_num $R_OUT)"
        printf "║  %-24s%-$((W-28))s║\n" "Context used" "${R_PCT}% of ${R_CTX_LABEL}"
        printf '╚'; printf '═%.0s' $(seq 2 $((W-1))); printf '╝\n'

        # Append to progress.txt
        echo "> Iteration $i: $(fmt_num $R_TOTAL) tokens (in: $(fmt_num $R_IN), out: $(fmt_num $R_OUT)) | ${R_PCT}% of ${R_CTX_LABEL} context | \$$R_COST | $R_DUR" >> "$PROGRESS_FILE"
      fi
    fi
    rm -f "$TMPFILE"
  fi

  # Check for completion signal
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "Ralph completed all tasks!"
    echo "Completed at iteration $i of $MAX_ITERATIONS"
    exit 0
  fi
  
  echo "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check $PROGRESS_FILE for status."
exit 1
