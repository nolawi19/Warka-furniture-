#!/usr/bin/env bash
# Starts a throwaway Postgres for local development.
#
# This is for working on the app in a sandbox. In production you point
# DATABASE_URL at a managed Postgres and never run this.
set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGDATA=${PGDATA:-/var/lib/warkapg}
PGPORT=${PGPORT:-5433}
PGUSER_=${PGUSER_:-warka}
PGDB=${PGDB:-warka_dev}

# Postgres refuses to run as root, so the cluster is owned by `postgres`.
as_pg() { su postgres -s /bin/bash -c "$1"; }

mkdir -p /tmp/pgrun && chown postgres:postgres /tmp/pgrun

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "initialising cluster at $PGDATA"
  rm -rf "$PGDATA" && mkdir -p "$PGDATA" && chown postgres:postgres "$PGDATA"
  as_pg "$PGBIN/initdb -D $PGDATA -U $PGUSER_ --auth=trust -E UTF8" >/dev/null
fi

if "$PGBIN/pg_isready" -h 127.0.0.1 -p "$PGPORT" >/dev/null 2>&1; then
  echo "postgres already up on $PGPORT"
else
  as_pg "$PGBIN/pg_ctl -D $PGDATA -o '-p $PGPORT -k /tmp/pgrun -c listen_addresses=127.0.0.1' -l $PGDATA/server.log start" >/dev/null
  for _ in $(seq 1 20); do
    "$PGBIN/pg_isready" -h 127.0.0.1 -p "$PGPORT" >/dev/null 2>&1 && break
    sleep 0.5
  done
fi

as_pg "$PGBIN/createdb -h 127.0.0.1 -p $PGPORT -U $PGUSER_ $PGDB" 2>/dev/null || true
"$PGBIN/pg_isready" -h 127.0.0.1 -p "$PGPORT"
