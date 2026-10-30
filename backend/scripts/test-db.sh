#!/usr/bin/env bash
# Throwaway PostgreSQL for the test suite. Never touches the shared database.
#
#   scripts/test-db.sh start   # creates/starts it on 127.0.0.1:55433
#   scripts/test-db.sh stop
#   scripts/test-db.sh reset   # stop and delete all test data
#
# CI doesn't use this; it runs a postgres service container instead.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
DATA_DIR="$PWD/.test-db"
PORT="${TEST_DB_PORT:-55433}"

# Fedora/RHEL put the server binaries outside PATH
for dir in /usr/pgsql-17/bin /usr/pgsql-16/bin /usr/lib/postgresql/17/bin /usr/lib/postgresql/16/bin; do
    [ -x "$dir/pg_ctl" ] && PATH="$dir:$PATH" && break
done
command -v pg_ctl >/dev/null || { echo "PostgreSQL server binaries (pg_ctl, initdb) not found" >&2; exit 1; }

case "${1:-start}" in
start)
    if [ ! -d "$DATA_DIR" ]; then
        initdb -D "$DATA_DIR" -U postgres --auth=trust >/dev/null
    fi
    if ! pg_ctl -D "$DATA_DIR" status >/dev/null 2>&1; then
        # TCP only: Unix socket paths in deep directories exceed the 107-byte limit
        pg_ctl -D "$DATA_DIR" -l "$DATA_DIR/server.log" -w \
            -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories='' -c fsync=off" start >/dev/null
    fi
    psql -h 127.0.0.1 -p "$PORT" -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='loopin_test'" | grep -q 1 \
        || psql -h 127.0.0.1 -p "$PORT" -U postgres -qc "CREATE DATABASE loopin_test"
    echo "Test database ready: postgresql://postgres@127.0.0.1:$PORT/loopin_test"
    ;;
stop)
    pg_ctl -D "$DATA_DIR" status >/dev/null 2>&1 && pg_ctl -D "$DATA_DIR" -m fast stop >/dev/null
    echo "Test database stopped"
    ;;
reset)
    "$0" stop || true
    rm -rf "$DATA_DIR"
    echo "Test database deleted"
    ;;
*)
    echo "usage: $0 start|stop|reset" >&2; exit 2 ;;
esac
