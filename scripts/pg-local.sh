#!/usr/bin/env bash
# Gère une instance PostgreSQL locale en espace utilisateur (aucun sudo requis).
# Usage : ./scripts/pg-local.sh {start|stop|status|psql}
set -euo pipefail

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGDATA="${PGDATA:-$HOME/.local/share/smartbiz-pg}"
PGSOCK="${PGSOCK:-$HOME/.local/share/smartbiz-pg-run}"
PGPORT="${PGPORT:-5433}"
PGUSER_LOCAL="${PGUSER_LOCAL:-smartbiz}"

init() {
  [ -d "$PGDATA/base" ] && return 0
  mkdir -p "$PGDATA" "$PGSOCK"
  "$PGBIN/initdb" -D "$PGDATA" -U "$PGUSER_LOCAL" --auth=trust --encoding=UTF8 --locale=C
}

ensure_databases() {
  for db in smartbiz smartbiz_shadow; do
    if ! "$PGBIN/psql" -h 127.0.0.1 -p "$PGPORT" -U "$PGUSER_LOCAL" -d postgres \
      -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1; then
      "$PGBIN/psql" -h 127.0.0.1 -p "$PGPORT" -U "$PGUSER_LOCAL" -d postgres -c "CREATE DATABASE $db"
    fi
  done
}

case "${1:-status}" in
  start)
    init
    mkdir -p "$PGSOCK"
    "$PGBIN/pg_ctl" -D "$PGDATA" -l "$PGDATA/server.log" \
      -o "-p $PGPORT -k $PGSOCK -c listen_addresses=127.0.0.1" start
    ensure_databases
    echo "PostgreSQL prêt sur 127.0.0.1:$PGPORT (base « smartbiz »)"
    ;;
  stop) "$PGBIN/pg_ctl" -D "$PGDATA" stop ;;
  status) "$PGBIN/pg_ctl" -D "$PGDATA" status ;;
  psql) "$PGBIN/psql" -h 127.0.0.1 -p "$PGPORT" -U "$PGUSER_LOCAL" -d smartbiz ;;
  *)
    echo "Usage: $0 {start|stop|status|psql}" >&2
    exit 1
    ;;
esac
