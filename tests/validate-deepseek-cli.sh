#!/bin/bash

# OpenClaw DeepSeek R1 14B CLI Validation Script
# 나노 단위 검증 테스트

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   OpenClaw DeepSeek R1 14B CLI Validation Suite           ║"
echo "║   나노 단위 검증 테스트 (CLI 방식)                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

source ~/.nvm/nvm.sh
nvm use 22

# Test case array
declare -a test_names=(
  "reasoning-complex"
  "coding-python"
  "reasoning-logic"
  "korean-language"
  "coding-function"
)

declare -a test_prompts=(
  "다음 수학 문제를 단계별로 풀어줘: 한 상자에 사과가 12개 들어있고, 5개 상자를 샀습니다. 사과의 30%를 친구에게 주었다면, 남은 사과는 몇 개인가요?"
  "Python으로 피보나치 수열을 재귀함수로 구현해줘. 코드만 간단하게."
  "세 사람 A, B, C가 있습니다. A는 B보다 키가 크고, C는 A보다 키가 작습니다. 가장 키가 큰 사람은 누구인가요? 논리적으로 설명해줘."
  "오픈클로에 DeepSeek R1 14B를 연동한 이유를 한 문장으로 설명해줘."
  "JavaScript로 배열의 중복을 제거하는 함수를 작성해줘. 코드만."
)

mkdir -p test-artifacts/cli-validation
RESULTS_FILE="test-artifacts/cli-validation/results-$(date +%Y-%m-%d_%H-%M-%S).md"

echo "# DeepSeek R1 14B CLI Validation Results" > "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"
echo "**Timestamp:** $(date -Iseconds)" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

passed=0
failed=0
total=${#test_names[@]}

for i in "${!test_names[@]}"; do
  name="${test_names[$i]}"
  prompt="${test_prompts[$i]}"

  echo ""
  echo "[$((i+1))/$total] Testing: $name"
  echo "  Prompt: ${prompt:0:60}..."

  # Create temp file for response
  response_file="test-artifacts/cli-validation/response_${name}.txt"

  # Execute test with timeout
  start_time=$(date +%s)
  echo "$prompt" | timeout 120s openclaw agent --message "$prompt" --json 2>&1 > "$response_file"
  exit_code=$?
  end_time=$(date +%s)
  duration=$((end_time - start_time))

  # Read response
  response=$(cat "$response_file" 2>/dev/null || echo "")
  response_length=${#response}

  echo "  Duration: ${duration}s"
  echo "  Response length: ${response_length} chars"

  # Write to markdown report
  echo "## Test $((i+1)): $name" >> "$RESULTS_FILE"
  echo "" >> "$RESULTS_FILE"
  echo "**Prompt:** $prompt" >> "$RESULTS_FILE"
  echo "" >> "$RESULTS_FILE"
  echo "**Duration:** ${duration}s" >> "$RESULTS_FILE"
  echo "**Response Length:** ${response_length} characters" >> "$RESULTS_FILE"
  echo "" >> "$RESULTS_FILE"

  if [ $exit_code -eq 0 ] && [ $response_length -gt 20 ]; then
    echo "  Status: ✓ PASSED"
    echo "**Status:** ✓ PASSED" >> "$RESULTS_FILE"
    ((passed++))
  else
    echo "  Status: ✗ FAILED (exit code: $exit_code)"
    echo "**Status:** ✗ FAILED" >> "$RESULTS_FILE"
    ((failed++))
  fi

  echo "" >> "$RESULTS_FILE"
  echo "**Response:**" >> "$RESULTS_FILE"
  echo "\`\`\`" >> "$RESULTS_FILE"
  echo "${response:0:1000}" >> "$RESULTS_FILE"
  if [ $response_length -gt 1000 ]; then
    echo "... (truncated)" >> "$RESULTS_FILE"
  fi
  echo "\`\`\`" >> "$RESULTS_FILE"
  echo "" >> "$RESULTS_FILE"
  echo "---" >> "$RESULTS_FILE"
  echo "" >> "$RESULTS_FILE"

  # Small delay between tests
  sleep 2
done

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                     TEST SUMMARY                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Total Tests:     $total"
echo "Passed:          $passed ✓"
echo "Failed:          $failed ✗"

success_rate=$(echo "scale=1; $passed * 100 / $total" | bc)
echo "Success Rate:    ${success_rate}%"
echo ""
echo "Results saved to: $RESULTS_FILE"

# Add summary to markdown
echo "## Summary" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"
echo "- **Total Tests:** $total" >> "$RESULTS_FILE"
echo "- **Passed:** $passed ✓" >> "$RESULTS_FILE"
echo "- **Failed:** $failed ✗" >> "$RESULTS_FILE"
echo "- **Success Rate:** ${success_rate}%" >> "$RESULTS_FILE"

exit $failed
