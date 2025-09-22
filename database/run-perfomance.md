# Copiar arquivo pro container ou pod 
> docker cp database/postgresql-performance.conf explorer-postgres-dev:/tmp/postgresql-performance.conf

# Aplicar 
docker exec -u root explorer-postgres-dev bash -c "cp /tmp/postgresql-performance.conf /var/lib/postgresql/data/ && chown postgres:postgres /var/lib/postgresql/data/postgresql-performance.conf"

# include to config postgree folder in container 

docker exec -u postgres explorer-postgres-dev bash -c 'echo "include = '\''postgresql-performance.conf'\''" >> /var/lib/postgresql/data/postgresql.conf'

# Reuniciar o Post

docker restart explorer-postgres-dev

# Verificar 

docker exec -it explorer-postgres-dev psql -U explorer -d blockexplorer -c "SELECT name, setting, unit, context FROM pg_settings WHERE name IN ('shared_buffers', 'work_mem', 'maintenance_work_mem', 'effective_cache_size', 'max_parallel_workers');"

docker exec -it explorer-postgres-dev psql -U explorer -d blockexplorer -c "SELECT name, setting FROM pg_settings WHERE name IN ('wal_level', 'autovacuum', 'max_connections', 'random_page_cost');"