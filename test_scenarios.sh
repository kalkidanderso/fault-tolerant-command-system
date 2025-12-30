#!/bin/bash
set -e

API="http://localhost:3000"

echo "Testing fault tolerance scenarios..."
echo ""

# Helper functions
get_status() {
  curl -s "${API}/commands/$1" | grep -o '"status":"[^"]*"' | cut -d'"' -f4
}

#########################################
# Test 1: Basic HTTP command
#########################################
echo "Test 1: HTTP_GET_JSON command"
echo "Submitting command..."
RESP=$(curl -s -X POST "${API}/commands" \
  -H "Content-Type: application/json" \
  -d '{"type":"HTTP_GET_JSON","payload":{"url":"https://jsonplaceholder.typicode.com/todos/1"}}')
ID=$(echo $RESP | grep -o '"commandId":"[^"]*"' | cut -d'"' -f4)
echo "Got ID: $ID"

sleep 5
STATUS=$(get_status $ID)
echo "Status: $STATUS"

if [ "$STATUS" == "COMPLETED" ]; then
    echo "✓ Passed"
else
    echo "✗ Failed - expected COMPLETED, got $STATUS"
fi

echo ""

#########################################
# Test 2: Agent crash recovery
#########################################
echo "Test 2: Agent crash + recovery"
echo "Stopping agent..."
docker stop vpn-agent-1 > /dev/null 2>&1

echo "Submitting 10s delay..."
RESP=$(curl -s -X POST "${API}/commands" \
  -H "Content-Type: application/json" \
  -d '{"type":"DELAY","payload":{"ms":10000}}')
CRASH_ID=$(echo $RESP | grep -o '"commandId":"[^"]*"' | cut -d'"' -f4)

# Start a "killer" agent that dies quickly
echo "Starting temporary agent (will crash)..."
docker run -d --name killer-agent --network vpn_fault-tolerant-net \
  --env SERVER_URL=http://server:3000 \
  --env AGENT_ID=killer-1 \
  --env POLL_INTERVAL_MS=1000 \
  vpn-agent node dist/index.js --kill-after=1 > /dev/null 2>&1

sleep 5

STATUS_AFTER_CRASH=$(get_status $CRASH_ID)
echo "After crash: $STATUS_AFTER_CRASH (should be RUNNING)"

# Clean up
docker rm -f killer-agent > /dev/null 2>&1
docker start vpn-agent-1 > /dev/null 2>&1

# The key part - server restart resets RUNNING jobs to PENDING
# (This is our recovery mechanism since we don't have agent timeouts)
echo "Restarting server to trigger recovery..."
docker restart vpn-server-1 > /dev/null 2>&1

echo "Waiting for agent to finish (this takes ~25s)..."
sleep 10
sleep 15

FINAL=$(get_status $CRASH_ID)
echo "Final status: $FINAL"

if [ "$FINAL" == "COMPLETED" ]; then
    echo "✓ Passed - system recovered from crash"
else
    echo "✗ Failed - command stuck at $FINAL"
fi

echo ""

#########################################
# Test 3: Server restart during execution
#########################################
echo "Test 3: Server restart mid-execution"
echo "Submitting 15s delay..."
RESP=$(curl -s -X POST "${API}/commands" \
  -H "Content-Type: application/json" \
  -d '{"type":"DELAY","payload":{"ms":15000}}')
RESTART_ID=$(echo $RESP | grep -o '"commandId":"[^"]*"' | cut -d'"' -f4)

sleep 5
echo "Current status: $(get_status $RESTART_ID)"

echo "Restarting server NOW (mid-execution)..."
docker restart vpn-server-1 > /dev/null 2>&1

sleep 5

# What happens:
# 1. Server sees job in RUNNING state -> resets to PENDING
# 2. Agent is still chugging away on the delay
# 3. When agent finishes, it reports result
# 4. OR if report fails (server was down), agent polls again and gets the PENDING job
echo ""
echo "How this works:"
echo "- Server reset RUNNING -> PENDING on restart"
echo "- Agent might finish and report successfully"
echo "- OR agent re-picks the job from PENDING queue"
echo "- Either way, job completes (might execute twice though)"
echo ""

sleep 20

STATUS_FINAL=$(get_status $RESTART_ID)
echo "Final status: $STATUS_FINAL"

if [ "$STATUS_FINAL" == "COMPLETED" ]; then
    echo "✓ Passed - handled server restart"
else
    echo "✗ Failed - ended as $STATUS_FINAL"
fi

echo ""
echo "All tests done!"
