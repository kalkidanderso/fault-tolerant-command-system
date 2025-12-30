#!/bin/bash
set -e

# Base URL
API="http://localhost:3000"

echo "🧪 STARTING COMPREHENSIVE SYSTEM TEST"
echo "======================================="

# Function to get command status
get_status() {
  curl -s "${API}/commands/$1" | grep -o '"status":"[^"]*"' | cut -d'"' -f4
}

# Function to get command result
get_result() {
  curl -s "${API}/commands/$1"
}

# ---------------------------------------------------------
# SCENARIO 1: HTTP_GET_JSON (Functional Test)
# ---------------------------------------------------------
echo ""
echo "🔹 SCENARIO 1: HTTP_GET_JSON Support"
echo "   Submitting HTTP request command..."
RESP=$(curl -s -X POST "${API}/commands" -H "Content-Type: application/json" -d '{"type":"HTTP_GET_JSON","payload":{"url":"https://jsonplaceholder.typicode.com/todos/1"}}')
ID=$(echo $RESP | grep -o '"commandId":"[^"]*"' | cut -d'"' -f4)
echo "   Command ID: $ID"

echo "   Waiting 5s for execution..."
sleep 5

STATUS=$(get_status $ID)
echo "   Status: $STATUS"

if [ "$STATUS" == "COMPLETED" ]; then
    echo "   ✅ SUCCESS: Command confirmed completed."
else
    echo "   ❌ FAILURE: Command did not complete."
fi


# ---------------------------------------------------------
# SCENARIO 2: AGENT CRASH & RECOVERY
# ---------------------------------------------------------
echo ""
echo "🔹 SCENARIO 2: Agent Crash Recovery"
echo "   Stopping healthy agent..."
docker stop vpn-agent-1 > /dev/null

echo "   Submitting 10s DELAY command..."
RESP=$(curl -s -X POST "${API}/commands" -H "Content-Type: application/json" -d '{"type":"DELAY","payload":{"ms":10000}}')
CRASH_ID=$(echo $RESP | grep -o '"commandId":"[^"]*"' | cut -d'"' -f4)
echo "   Command ID: $CRASH_ID"

echo "   Starting 'Killer Agent' (dies after 1 cycle)..."
# We run a temporary container that connects to the same network and uses the same config
docker run -d --name killer-agent --network vpn_fault-tolerant-net \
  --env SERVER_URL=http://server:3000 \
  --env AGENT_ID=killer-1 \
  --env POLL_INTERVAL_MS=1000 \
  vpn-agent node dist/index.js --kill-after=1 > /dev/null

echo "   Waiting 5s for agent to pick up job and crash..."
sleep 5

STATUS_AFTER_CRASH=$(get_status $CRASH_ID)
echo "   Status after crash: $STATUS_AFTER_CRASH"
echo "   (Expected: RUNNING [stale] or PENDING [recovered])"

echo "   Cleaning up killer agent..."
docker rm -f killer-agent > /dev/null

echo "   Restarting Healthy Agent to recover the job..."
docker start vpn-agent-1 > /dev/null

# We need the SERVER to restart to reset the stale RUNNING job to PENDING
# OR - if we implemented timeout logic, it would happen automatically. 
# Our current implementation requires Server Restart to recover 'RUNNING' jobs.
echo "   Restarting Server to trigger Stale Job Recovery..."
docker restart vpn-server-1 > /dev/null
echo "   Waiting 10s for Server to come up and Agent to reconnect..."
sleep 10

echo "   Waiting 15s for Healthy Agent to re-process..."
sleep 15

FINAL_STATUS=$(get_status $CRASH_ID)
echo "   Final Status: $FINAL_STATUS"

if [ "$FINAL_STATUS" == "COMPLETED" ]; then
     echo "   ✅ SUCCESS: System recovered and completed the crashed command."
else
     echo "   ❌ FAILURE: Command stuck in $FINAL_STATUS."
fi


# ---------------------------------------------------------
# SCENARIO 3: SERVER RESTART
# ---------------------------------------------------------
echo ""
echo "🔹 SCENARIO 3: Server Restart Durability"
echo "   Submitting 15s DELAY command..."
RESP=$(curl -s -X POST "${API}/commands" -H "Content-Type: application/json" -d '{"type":"DELAY","payload":{"ms":15000}}')
RESTART_ID=$(echo $RESP | grep -o '"commandId":"[^"]*"' | cut -d'"' -f4)

echo "   Waiting 5s for Agent to pick it up..."
sleep 5
echo "   Current Status: $(get_status $RESTART_ID)"

echo "   💥 RESTARTING SERVER MID-EXECUTION..."
docker restart vpn-server-1 > /dev/null
echo "   Server restarting..."
sleep 5

echo "   The Agent is still running. When the server comes back:"
echo "   1. Server sees 'RUNNING' job -> Resets to 'PENDING'"
echo "   2. Agent finishes execution -> Tries to report -> Success (or fails if ID changed, but job is safe)"
echo "   3. If Agent fails to report, it picks up 'PENDING' job again (Idempotency)"

echo "   Waiting 20s for completion..."
sleep 20

STATUS_FINAL=$(get_status $RESTART_ID)
echo "   Final Status: $STATUS_FINAL"

if [ "$STATUS_FINAL" == "COMPLETED" ]; then
    echo "   ✅ SUCCESS: Command completed despite server restart."
else
    echo "   ❌ FAILURE: Command ended as $STATUS_FINAL."
fi

echo ""
echo "🏁 TEST SUITE COMPLETED"
echo "======================================="
