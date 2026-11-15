#!/bin/bash
# Esegue i test su un Postgres locale: ./run.sh
cd "$(dirname "$0")"
sudo -u postgres dropdb --if-exists stuoie_test 2>/dev/null; sudo -u postgres createdb stuoie_test
for f in 00_supabase_stub.sql ../schema.sql ../seed.sql 10_grants.sql 20_scenario.sql; do
  echo "=== $f"
  sudo -u postgres psql -q -X -v ON_ERROR_STOP=1 -d stuoie_test -f "$f" || { echo "FAILED $f"; exit 1; }
done
