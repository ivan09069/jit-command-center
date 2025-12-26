# deploy_now.ps1
# Quick manual deployment - run this anytime
# No scheduling required

param(
    [switch]$DryRun,
    [string]$WebhookUrl = ""
)

$ProjectPath = "E:\jit-command-center"

Write-Host "=== Manual Deployment ===" -ForegroundColor Cyan

# Check if in correct directory
if (-not (Test-Path (Join-Path $ProjectPath "package.json"))) {
    Write-Host "ERROR: Not a valid project directory" -ForegroundColor Red
    Write-Host "Expected: $ProjectPath" -ForegroundColor Yellow
    exit 1
}

# Install Python deps if needed
if (-not (python -c "import requests" 2>$null)) {
    Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
    pip install requests
}

# Build command
$cmd = "python deployment_agent.py --project `"$ProjectPath`""

if ($DryRun) {
    Write-Host "MODE: Dry run (validation only)" -ForegroundColor Yellow
    $cmd += " --dry-run"
} else {
    Write-Host "MODE: Full deployment" -ForegroundColor Green
}

if ($WebhookUrl) {
    $cmd += " --webhook `"$WebhookUrl`""
}

$outputFile = Join-Path $ProjectPath "deployment_report.json"
$cmd += " --output `"$outputFile`""

Write-Host "`nStarting deployment agent..." -ForegroundColor Cyan

cd $ProjectPath
Invoke-Expression $cmd

# Display result
Write-Host "`n========================================" -ForegroundColor Cyan

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS" -ForegroundColor Green
    
    $report = Get-Content $outputFile | ConvertFrom-Json
    Write-Host "Duration: $($report.duration_seconds)s" -ForegroundColor Gray
    
    if ($report.deployed) {
        Write-Host "`nDeployed to production" -ForegroundColor Green
        Write-Host "Check Vercel dashboard for live URL" -ForegroundColor Cyan
    } else {
        Write-Host "`nValidation passed (dry run)" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "FAILED" -ForegroundColor Red
    
    if (Test-Path $outputFile) {
        $report = Get-Content $outputFile | ConvertFrom-Json
        Write-Host "Reason: $($report.reason)" -ForegroundColor Red
        
        Write-Host "`nSee $outputFile for full log" -ForegroundColor Yellow
    }
}

Write-Host "========================================" -ForegroundColor Cyan

exit $LASTEXITCODE
