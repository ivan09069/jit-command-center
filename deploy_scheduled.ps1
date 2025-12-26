# deploy_scheduled.ps1
# Windows Task Scheduler script for autonomous deployment
# Schedule this to run at specific times (e.g., 2 AM)

param(
    [string]$ProjectPath = "E:\jit-command-center",
    [string]$WebhookUrl = "",
    [switch]$DryRun
)

Write-Host "=== Scheduled Deployment Agent ===" -ForegroundColor Cyan
Write-Host "Time: $(Get-Date)" -ForegroundColor Gray
Write-Host "Project: $ProjectPath" -ForegroundColor Gray

# Ensure Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python not found in PATH" -ForegroundColor Red
    exit 1
}

# Install required Python packages
Write-Host "`nInstalling Python dependencies..." -ForegroundColor Yellow
pip install requests -q

# Build command
$cmd = "python deployment_agent.py --project `"$ProjectPath`""

if ($WebhookUrl) {
    $cmd += " --webhook `"$WebhookUrl`""
}

if ($DryRun) {
    $cmd += " --dry-run"
}

$outputFile = Join-Path $ProjectPath "deployment_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$cmd += " --output `"$outputFile`""

# Run deployment agent
Write-Host "`nRunning deployment agent..." -ForegroundColor Yellow
Write-Host "Command: $cmd" -ForegroundColor Gray

cd $ProjectPath

$result = Invoke-Expression $cmd

# Check result
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== DEPLOYMENT SUCCEEDED ===" -ForegroundColor Green
    
    # Read and display report
    if (Test-Path $outputFile) {
        $report = Get-Content $outputFile | ConvertFrom-Json
        Write-Host "Duration: $($report.duration_seconds)s" -ForegroundColor Green
        Write-Host "Deployed: $($report.deployed)" -ForegroundColor Green
    }
    
    # Send success notification (optional)
    if ($WebhookUrl) {
        Write-Host "`nNotification sent to webhook" -ForegroundColor Cyan
    }
    
} else {
    Write-Host "`n=== DEPLOYMENT FAILED ===" -ForegroundColor Red
    
    # Read and display error
    if (Test-Path $outputFile) {
        $report = Get-Content $outputFile | ConvertFrom-Json
        Write-Host "Reason: $($report.reason)" -ForegroundColor Red
        
        Write-Host "`nLast 10 log entries:" -ForegroundColor Yellow
        $report.logs | Select-Object -Last 10 | ForEach-Object {
            $color = switch ($_.level) {
                "ERROR" { "Red" }
                "WARN" { "Yellow" }
                "SUCCESS" { "Green" }
                default { "Gray" }
            }
            Write-Host "[$($_.level)] $($_.message)" -ForegroundColor $color
        }
    }
    
    # Send failure notification
    if ($WebhookUrl) {
        Write-Host "`nFailure notification sent to webhook" -ForegroundColor Cyan
    }
}

Write-Host "`nReport saved to: $outputFile" -ForegroundColor Cyan

exit $LASTEXITCODE
