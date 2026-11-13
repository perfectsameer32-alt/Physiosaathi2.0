#!/usr/bin/env bash
# PhysioSaathi - One-command launcher for Mac / Linux

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================================="
echo "      Pysiosaathi — AI Fitness & Yoga Companion           "
echo "=========================================================="

# 1. Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies (first time setup)..."
    cd "$PROJECT_DIR/frontend"
    npm install --legacy-peer-deps
    cd "$PROJECT_DIR"
fi

# 2. Trap exit to kill background backend process
cleanup() {
    echo ""
    echo "Shutting down servers..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 3. Start Backend in background
echo "🚀 Starting FastAPI backend on http://localhost:8001..."
PYTHON_BIN="python3"
if [ -f "$PROJECT_DIR/backend/.venv/bin/python" ]; then
    PYTHON_BIN="$PROJECT_DIR/backend/.venv/bin/python"
fi
"$PYTHON_BIN" -m uvicorn server:app --app-dir "$PROJECT_DIR/backend" --port 8001 --reload &
BACKEND_PID=$!

# Wait 1 second for backend boot
sleep 1

# 4. Start React Frontend
echo "🌐 Starting React frontend on http://localhost:3000..."
cd "$PROJECT_DIR/frontend"
npm start

