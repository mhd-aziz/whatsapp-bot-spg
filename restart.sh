#!/bin/bash
# Quick restart script - kills port 3000 and starts bot

echo "🔄 Restarting WhatsApp Bot..."
echo ""

# Kill any process on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 1

# Kill any node processes running index.js
ps aux | grep "node.*index.js" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null

echo "✅ Old processes killed"
echo "🚀 Starting bot..."
echo ""

# Start the bot
npm start
