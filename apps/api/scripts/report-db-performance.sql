\pset pager off
\echo '=== PostgreSQL settings ==='
SELECT current_setting('server_version') AS server_version,
       current_setting('shared_preload_libraries') AS shared_preload_libraries,
       current_setting('track_io_timing') AS track_io_timing;

\echo '=== Top statements by total execution time ==='
SELECT calls,
       round(total_exec_time::numeric, 2) AS total_ms,
       round(mean_exec_time::numeric, 2) AS mean_ms,
       rows,
       left(regexp_replace(query, '\\s+', ' ', 'g'), 180) AS query
FROM pg_stat_statements
WHERE query NOT ILIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 20;

\echo '=== Application tables by size and scan behavior ==='
SELECT relname AS table_name,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
       n_live_tup,
       n_dead_tup,
       seq_scan,
       idx_scan,
       CASE WHEN seq_scan + idx_scan = 0 THEN 0
            ELSE round(100.0 * idx_scan / (seq_scan + idx_scan), 1)
       END AS index_scan_pct
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 25;

\echo '=== Large unused non-unique indexes ==='
SELECT schemaname,
       relname AS table_name,
       indexrelname AS index_name,
       pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
       idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT IN (
    SELECT conname FROM pg_constraint WHERE contype IN ('p', 'u')
  )
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 25;
