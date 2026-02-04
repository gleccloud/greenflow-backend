#!/bin/bash

# Configuration
INTERVAL=300 # 5 minutes in seconds
AGENT_NAME="coder"
TARGET_PHONE="+821057022171"

PAYLOAD="### COMMAND:
1. READ 'PROJECT_SPEC.md' immediately.
2. COPY the SQL code from the 'REQUIRED DATABASE SCHEMA' section.
3. SAVE it to 'init.sql' using the write_file tool.
4. SEND a WhatsApp message to '+821057022171' saying: 'DB Schema Created'.

DO NOT TALK. JUST RUN THE TOOLS."

echo "🚀 Starting OpenClaw External Pacemaker..."
echo "⏱️  Interval: ${INTERVAL}s"
echo "🤖 Agent: ${AGENT_NAME}"

while true; do
  TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
  echo "[$TIMESTAMP] ⚡ Triggering agent heartbeat..."
  
  # Trigger the agent
  source ~/.nvm/nvm.sh && nvm use 22 > /dev/null 2>&1
  openclaw agent --local --agent $AGENT_NAME --message "$PAYLOAD"
  
  echo "[$TIMESTAMP] ✅ Trigger sent. Output logged to gateway."
  echo "zzz Sleeping for ${INTERVAL} seconds..."
  sleep $INTERVAL
done
