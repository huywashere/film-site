$ErrorActionPreference = "Stop"

if (-not $env:DIRECT_DATABASE_URL -and -not $env:DATABASE_URL) {
  $envFile = Join-Path $PSScriptRoot "..\apps\api\.env"
  if (Test-Path -LiteralPath $envFile) {
    $lines = Get-Content -LiteralPath $envFile
    $line = $lines |
      Where-Object { $_ -match '^DIRECT_DATABASE_URL=' } |
      Select-Object -First 1
    if (-not $line) {
      $line = $lines |
        Where-Object { $_ -match '^DATABASE_URL=' } |
        Select-Object -First 1
    }
    if ($line) {
      $databaseConnectionUrl = ($line -replace '^[A-Z_]+=', '').Trim().Trim('"')
    }
  }
}

$databaseConnectionUrl = if ($databaseConnectionUrl) {
  $databaseConnectionUrl
} elseif ($env:DIRECT_DATABASE_URL) {
  $env:DIRECT_DATABASE_URL
} else {
  $env:DATABASE_URL
}
if (-not $databaseConnectionUrl) {
  throw "DIRECT_DATABASE_URL or DATABASE_URL is required (or define one in apps/api/.env)."
}
$psqlCommand = Get-Command psql -ErrorAction SilentlyContinue
$psqlPath = if ($psqlCommand) { $psqlCommand.Source } else { $null }
if (-not $psqlPath) {
  $standardPsql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
  if (Test-Path -LiteralPath $standardPsql) {
    $psqlPath = $standardPsql
  }
}
if (-not $psqlPath) {
  throw "psql is required. Install PostgreSQL client tools or run the SQL file inside the database container."
}

$builder = [System.UriBuilder]::new($databaseConnectionUrl)
$prismaOnlyParameters = @("schema", "connection_limit", "pool_timeout")
$queryPairs = @($builder.Query.TrimStart("?").Split("&", [System.StringSplitOptions]::RemoveEmptyEntries) | Where-Object {
  $name = ([System.Uri]::UnescapeDataString(($_ -split "=", 2)[0])).ToLowerInvariant()
  $prismaOnlyParameters -notcontains $name
})
$builder.Query = $queryPairs -join "&"
$psqlDatabaseUrl = $builder.Uri.AbsoluteUri

& $psqlPath $psqlDatabaseUrl -v ON_ERROR_STOP=1 -f "apps/api/scripts/report-db-performance.sql"
if ($LASTEXITCODE -ne 0) {
  throw "Database performance report failed with exit code $LASTEXITCODE"
}
