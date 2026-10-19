#!/usr/bin/env bash
# Serve the TurboComplex site and print the address.
#   ./start.sh            # foreground on 8000 (or the next free port)
#   ./start.sh 9000       # preferred port
#   ./start.sh --bg       # run in background (log: .server.log, pid: .server.pid)
#   ./start.sh stop       # stop a background server
set -euo pipefail
cd "$(dirname "$0")"

PID_FILE=.server.pid
LOG_FILE=.server.log
PORT=8000
BG=0

for arg in "$@"; do
  case "$arg" in
    stop)
      if [[ -f $PID_FILE ]] && kill "$(cat $PID_FILE)" 2>/dev/null; then
        echo "Stopped server (pid $(cat $PID_FILE))."
      else
        echo "No running background server."
      fi
      rm -f $PID_FILE
      exit 0 ;;
    --bg|-d) BG=1 ;;
    ''|*[!0-9]*) echo "Unknown argument: $arg" >&2; exit 1 ;;
    *) PORT=$arg ;;
  esac
done

if [[ -f $PID_FILE ]] && kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
  echo "Already running in background (pid $(cat $PID_FILE)):"
  sed -n 's/.*port \([0-9]*\).*/  http:\/\/localhost:\1\//p' "$LOG_FILE" | head -1
  echo "Stop it first with: ./start.sh stop"
  exit 0
fi

PY=$(command -v python3 || command -v python || true)
[[ -n $PY ]] || { echo "python3 not found" >&2; exit 1; }

port_free() { ! "$PY" - "$1" <<'EOF'
import socket, sys
s = socket.socket()
try:
    s.bind(('0.0.0.0', int(sys.argv[1])))
except OSError:
    sys.exit(0)  # busy
sys.exit(1)      # free
EOF
}

for _ in $(seq 1 50); do
  port_free "$PORT" && break
  PORT=$((PORT + 1))
done
port_free "$PORT" || { echo "No free port found near $PORT" >&2; exit 1; }

IP=$(hostname -I 2>/dev/null | awk '{print $1}')
banner() {
  echo "TurboComplex site is running"
  echo "  Port:    $PORT"
  echo "  Local:   http://localhost:$PORT/"
  [[ -n $IP ]] && echo "  Network: http://$IP:$PORT/"
}

if [[ $BG == 1 ]]; then
  nohup "$PY" -u -m http.server "$PORT" --bind 0.0.0.0 >"$LOG_FILE" 2>&1 &
  echo $! >$PID_FILE
  sleep 0.5
  kill -0 "$(cat $PID_FILE)" 2>/dev/null || { echo "Server failed to start, see $LOG_FILE" >&2; exit 1; }
  banner
  echo "  PID:     $(cat $PID_FILE)  (stop with: ./start.sh stop)"
else
  banner
  echo "  Press Ctrl+C to stop."
  exec "$PY" -m http.server "$PORT" --bind 0.0.0.0
fi
