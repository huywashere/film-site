param(
  [switch]$InfrastructureOnly,
  [int]$TimeoutSeconds = 90
)

$ErrorActionPreference = "Continue"

function Test-TcpPort {
  param([string]$HostName, [int]$Port)
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $task = $client.ConnectAsync($HostName, $Port)
    return $task.Wait(1500) -and $client.Connected
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Test-HttpEndpoint {
  param([string]$Url)
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 4
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

$checks = @(
  @{ Name = "PostgreSQL"; Test = { Test-TcpPort "127.0.0.1" 5433 } },
  @{ Name = "Redis"; Test = { Test-TcpPort "127.0.0.1" 6379 } },
  @{ Name = "Typesense"; Test = { Test-HttpEndpoint "http://127.0.0.1:8108/health" } },
  @{ Name = "RabbitMQ"; Test = { Test-TcpPort "127.0.0.1" 5672 } }
)

if (-not $InfrastructureOnly) {
  $checks += @(
    @{ Name = "FFmpeg"; Test = { $null -ne (Get-Command ffmpeg -ErrorAction SilentlyContinue) } },
    @{ Name = "Recommendation Engine"; Test = { Test-HttpEndpoint "http://127.0.0.1:8000/health" } },
    @{ Name = "Media Gateway"; Test = { Test-HttpEndpoint "http://127.0.0.1:8081/readyz" } },
    @{ Name = "API"; Test = { Test-HttpEndpoint "http://127.0.0.1:3001/api/v1/health" } },
    @{ Name = "Web"; Test = { Test-HttpEndpoint "http://127.0.0.1:3000/api/health" } },
    @{ Name = "Admin"; Test = { Test-HttpEndpoint "http://127.0.0.1:3002/login" } }
  )
}

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$pending = [System.Collections.Generic.List[object]]::new()
foreach ($check in $checks) { $pending.Add($check) }

while ($pending.Count -gt 0 -and (Get-Date) -lt $deadline) {
  foreach ($check in @($pending)) {
    if (& $check.Test) {
      Write-Host "[OK] $($check.Name)" -ForegroundColor Green
      [void]$pending.Remove($check)
    }
  }
  if ($pending.Count -gt 0) { Start-Sleep -Seconds 2 }
}

if ($pending.Count -gt 0) {
  foreach ($check in $pending) {
    Write-Host "[FAIL] $($check.Name) is not ready" -ForegroundColor Red
  }
  exit 1
}

exit 0
