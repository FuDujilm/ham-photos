#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
RUN_DIR="$ROOT_DIR/.dev"
PID_DIR="$RUN_DIR/pids"
LOG_DIR="$RUN_DIR/logs"
PNPM_STORE="$ROOT_DIR/.pnpm-store"

FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

usage() {
  cat <<'USAGE'
Usage: ./dev.sh [command] [service]

Commands:
  start      Start local dev services (default)
  stop       Stop local dev services started by this script
  restart    Restart local dev services
  status     Show process and endpoint status
  logs       Follow service logs
  help       Show this help message

Services:
  all        Frontend and backend (default)
  frontend   Vite dev server only
  backend    Rust API only

Examples:
  ./dev.sh
  ./dev.sh start frontend
  ./dev.sh logs backend
  ./dev.sh stop
USAGE
}

mkdir -p "$PID_DIR" "$LOG_DIR"

ensure_env() {
  if [[ -f "$ROOT_DIR/.env" ]]; then
    return
  fi

  if [[ ! -f "$ROOT_DIR/.env.example" ]]; then
    echo "Error: .env is missing and .env.example was not found." >&2
    exit 1
  fi

  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  echo "Created .env from .env.example."
}

pid_file() {
  printf '%s/%s.pid' "$PID_DIR" "$1"
}

log_file() {
  printf '%s/%s.log' "$LOG_DIR" "$1"
}

is_running() {
  local service="$1"
  local file pid
  file="$(pid_file "$service")"

  [[ -f "$file" ]] || return 1
  pid="$(<"$file")"
  [[ -n "$pid" ]] || return 1

  if kill -0 "$pid" >/dev/null 2>&1; then
    return 0
  fi

  rm -f "$file"
  return 1
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' was not found." >&2
    exit 1
  fi
}

wait_for_http() {
  local url="$1"
  local seconds="${2:-20}"
  local i

  for ((i = 0; i < seconds; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  return 1
}

print_recent_log() {
  local service="$1"
  local log
  log="$(log_file "$service")"

  if [[ -f "$log" ]]; then
    echo "Recent $service log:" >&2
    tail -40 "$log" >&2
  fi
}

start_detached() {
  local service="$1"
  local workdir="$2"
  local log
  shift 2

  log="$(log_file "$service")"
  (
    cd "$workdir"
    if command -v setsid >/dev/null 2>&1; then
      setsid "$@" >"$log" 2>&1 < /dev/null &
    else
      nohup "$@" >"$log" 2>&1 < /dev/null &
    fi
    echo $! >"$(pid_file "$service")"
  )
}

postgres_ready() {
  command -v pg_isready >/dev/null 2>&1 || return 1
  pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" >/dev/null 2>&1
}

start_postgres_if_needed() {
  if postgres_ready; then
    return
  fi

  echo "PostgreSQL is not ready on $POSTGRES_HOST:$POSTGRES_PORT; trying to start postgresql.service..."
  if command -v systemctl >/dev/null 2>&1; then
    systemctl start postgresql >/dev/null 2>&1 || sudo systemctl start postgresql >/dev/null 2>&1 || true
  fi

  local i
  for ((i = 0; i < 20; i++)); do
    if postgres_ready; then
      return
    fi
    sleep 1
  done

  echo "Error: PostgreSQL is not ready on $POSTGRES_HOST:$POSTGRES_PORT." >&2
  echo "Start PostgreSQL manually or update DATABASE_URL in .env." >&2
  exit 1
}

ensure_frontend_deps() {
  if [[ -f "$FRONTEND_DIR/node_modules/vite/bin/vite.js" ]]; then
    return
  fi

  echo "Installing frontend dependencies..."
  if command -v pnpm >/dev/null 2>&1; then
    if (cd "$FRONTEND_DIR" && pnpm install --store-dir "$PNPM_STORE"); then
      return
    fi

    if [[ -f "$FRONTEND_DIR/node_modules/vite/bin/vite.js" ]]; then
      echo "pnpm reported a non-fatal install issue; continuing because Vite is available."
      return
    fi
  fi

  require_command npm
  (cd "$FRONTEND_DIR" && npm install)
}

start_frontend() {
  if is_running frontend; then
    echo "Frontend already running at http://$FRONTEND_HOST:$FRONTEND_PORT"
    return
  fi

  ensure_frontend_deps

  local log pid
  log="$(log_file frontend)"
  echo "Starting frontend at http://$FRONTEND_HOST:$FRONTEND_PORT ..."
  start_detached frontend "$FRONTEND_DIR" node ./node_modules/vite/bin/vite.js --host "$FRONTEND_HOST" --port "$FRONTEND_PORT"

  pid="$(<"$(pid_file frontend)")"
  sleep 1
  if ! kill -0 "$pid" >/dev/null 2>&1; then
    echo "Error: frontend failed to start. See $log" >&2
    print_recent_log frontend
    exit 1
  fi

  if command -v curl >/dev/null 2>&1 && ! wait_for_http "http://$FRONTEND_HOST:$FRONTEND_PORT/" 20; then
    echo "Error: frontend did not respond at http://$FRONTEND_HOST:$FRONTEND_PORT/." >&2
    print_recent_log frontend
    exit 1
  fi
}

start_backend() {
  if is_running backend; then
    echo "Backend already running at http://$BACKEND_HOST:$BACKEND_PORT"
    return
  fi

  ensure_env
  start_postgres_if_needed
  require_command cargo

  echo "Building backend..."
  (cd "$ROOT_DIR" && cargo build --manifest-path backend/Cargo.toml)

  local log pid
  log="$(log_file backend)"
  echo "Starting backend at http://$BACKEND_HOST:$BACKEND_PORT ..."
  start_detached backend "$ROOT_DIR" ./backend/target/debug/ham-photos-backend

  pid="$(<"$(pid_file backend)")"
  sleep 2
  if ! kill -0 "$pid" >/dev/null 2>&1; then
    echo "Error: backend failed to start. See $log" >&2
    print_recent_log backend
    exit 1
  fi

  if command -v curl >/dev/null 2>&1 && ! wait_for_http "http://$BACKEND_HOST:$BACKEND_PORT/api/health" 20; then
    echo "Error: backend did not respond at http://$BACKEND_HOST:$BACKEND_PORT/api/health." >&2
    print_recent_log backend
    exit 1
  fi
}

stop_service() {
  local service="$1"
  local file pid
  file="$(pid_file "$service")"

  if ! is_running "$service"; then
    echo "$service is not running."
    rm -f "$file"
    return
  fi

  pid="$(<"$file")"
  echo "Stopping $service (pid $pid)..."
  kill "$pid" >/dev/null 2>&1 || true

  local i
  for ((i = 0; i < 10; i++)); do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      rm -f "$file"
      return
    fi
    sleep 1
  done

  echo "$service did not stop gracefully; sending SIGKILL."
  kill -9 "$pid" >/dev/null 2>&1 || true
  rm -f "$file"
}

start_service() {
  case "$1" in
    all)
      start_backend
      start_frontend
      ;;
    frontend)
      start_frontend
      ;;
    backend)
      start_backend
      ;;
    *)
      echo "Unknown service: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
}

stop_services() {
  case "$1" in
    all)
      stop_service frontend
      stop_service backend
      ;;
    frontend|backend)
      stop_service "$1"
      ;;
    *)
      echo "Unknown service: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
}

status_service() {
  local service="$1"
  local url="$2"
  local pid="-"

  if is_running "$service"; then
    pid="$(<"$(pid_file "$service")")"
    printf '%-9s running pid=%s url=%s\n' "$service" "$pid" "$url"
  else
    printf '%-9s stopped url=%s\n' "$service" "$url"
  fi
}

show_status() {
  case "$1" in
    all)
      status_service backend "http://$BACKEND_HOST:$BACKEND_PORT"
      status_service frontend "http://$FRONTEND_HOST:$FRONTEND_PORT"
      ;;
    frontend)
      status_service frontend "http://$FRONTEND_HOST:$FRONTEND_PORT"
      ;;
    backend)
      status_service backend "http://$BACKEND_HOST:$BACKEND_PORT"
      ;;
    *)
      echo "Unknown service: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
}

follow_logs() {
  case "$1" in
    all)
      tail -f "$(log_file backend)" "$(log_file frontend)"
      ;;
    frontend|backend)
      tail -f "$(log_file "$1")"
      ;;
    *)
      echo "Unknown service: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
}

command="${1:-start}"
service="${2:-all}"

case "$command" in
  start)
    start_service "$service"
    echo
    show_status "$service"
    echo
    echo "Frontend: http://$FRONTEND_HOST:$FRONTEND_PORT"
    echo "Backend API: http://$BACKEND_HOST:$BACKEND_PORT"
    ;;
  stop)
    stop_services "$service"
    ;;
  restart)
    stop_services "$service"
    start_service "$service"
    echo
    show_status "$service"
    ;;
  status|ps)
    show_status "$service"
    ;;
  logs)
    follow_logs "$service"
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    echo "Unknown command: $command" >&2
    usage >&2
    exit 1
    ;;
esac
