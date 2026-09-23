$ErrorActionPreference = "Stop"

$databaseConnectionUrl = if ($env:DIRECT_DATABASE_URL) {
  $env:DIRECT_DATABASE_URL
} else {
  $env:DATABASE_URL
}
if (-not $databaseConnectionUrl) {
  throw "DIRECT_DATABASE_URL or DATABASE_URL is required."
}
if (-not $env:NETPHIM_EXPLAIN_USER_ID) {
  throw "NETPHIM_EXPLAIN_USER_ID is required (use a real user id with history)."
}
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "psql is required. Install PostgreSQL client tools or run this script inside the PostgreSQL container."
}

$query = if ($env:NETPHIM_EXPLAIN_QUERY) { $env:NETPHIM_EXPLAIN_QUERY } else { "bo gia" }
$builder = [System.UriBuilder]::new($databaseConnectionUrl)
$prismaOnlyParameters = @("schema", "connection_limit", "pool_timeout")
$queryPairs = @($builder.Query.TrimStart("?").Split("&", [System.StringSplitOptions]::RemoveEmptyEntries) | Where-Object {
  $name = ([System.Uri]::UnescapeDataString(($_ -split "=", 2)[0])).ToLowerInvariant()
  $prismaOnlyParameters -notcontains $name
})
$builder.Query = $queryPairs -join "&"
$psqlDatabaseUrl = $builder.Uri.AbsoluteUri

psql $psqlDatabaseUrl `
  -v "user_id=$env:NETPHIM_EXPLAIN_USER_ID" `
  -v "search_query=$query" `
  -f "apps/api/scripts/explain-critical-queries.sql"

if ($LASTEXITCODE -ne 0) {
  throw "psql EXPLAIN ANALYZE failed with exit code $LASTEXITCODE"
}
