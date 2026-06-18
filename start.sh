#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'USAGE'
Usage: ./start.sh [command]

Commands:
  up, start   Start all services in the background (default)
  down, stop  Stop and remove services
  restart     Restart all services
  logs        Follow service logs
  status      Show service status
  build       Build or rebuild service images
  help        Show this help message
USAGE
}

compose() {
  local docker_cmd=(docker)

  if ! docker info >/dev/null 2>&1; then
    if command -v sudo >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1; then
      docker_cmd=(sudo docker)
    else
      echo "Error: Docker daemon is not running or current user cannot access it." >&2
      echo "Try: sudo systemctl start docker" >&2
      echo "If it is a permission issue, add your user to the docker group and log in again." >&2
      exit 1
    fi
  fi

  if "${docker_cmd[@]}" compose version >/dev/null 2>&1; then
    "${docker_cmd[@]}" compose "$@"
  elif command -v docker-compose >/dev/null 2>&1 && [[ "${docker_cmd[0]}" == "docker" ]]; then
    docker-compose "$@"
  elif command -v sudo >/dev/null 2>&1 && sudo docker-compose version >/dev/null 2>&1; then
    sudo docker-compose "$@"
  else
    echo "Error: Docker Compose is not installed." >&2
    exit 1
  fi
}

ensure_env() {
  if [[ -f .env ]]; then
    return
  fi

  if [[ ! -f .env.example ]]; then
    echo "Error: .env is missing and .env.example was not found." >&2
    exit 1
  fi

  cp .env.example .env
  echo "Created .env from .env.example."
  echo "Edit .env and fill in Cloudflare, JWT, database, and admin settings before production use."
}

command="${1:-up}"

case "$command" in
  up|start)
    ensure_env
    compose up -d
    compose ps
    echo
    echo "Frontend: http://localhost"
    echo "Backend API: http://localhost:3000"
    echo "Admin: http://localhost/admin"
    ;;
  down|stop)
    compose down
    ;;
  restart)
    ensure_env
    compose down
    compose up -d
    compose ps
    ;;
  logs)
    compose logs -f "${@:2}"
    ;;
  status|ps)
    compose ps
    ;;
  build)
    ensure_env
    compose build "${@:2}"
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    echo "Unknown command: $command" >&2
    echo >&2
    usage >&2
    exit 1
    ;;
esac
