#!/usr/bin/env bash
# Double-click this file in Finder to launch SummerQuest.
# It will:
#   1. cd to the app folder
#   2. install npm deps if missing
#   3. start the Vite dev server
#   4. open your default browser to the app

set -e
cd "$(dirname "$0")"

echo "🌞 SummerQuest launcher"
echo "----------------------"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not installed."
  echo "   Install it from https://nodejs.org and try again."
  read -n1 -r -p "Press any key to close..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "📦 First run — installing dependencies (this takes a minute)..."
  npm install
fi

echo "🚀 Starting SummerQuest at http://localhost:5173"
echo "   Close this Terminal window to stop the game."
echo ""

# Vite is already configured to auto-open the browser (server.open = true)
exec npm run dev
