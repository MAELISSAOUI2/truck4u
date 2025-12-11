# Truck4u - Database Sync Script (Simplified)
Write-Host ""
Write-Host "=== Truck4u - Database Sync ===" -ForegroundColor Cyan
Write-Host ""

# Stop servers reminder
Write-Host "Please stop all servers (API and Web)" -ForegroundColor Yellow
Write-Host "Press ENTER to continue..." -ForegroundColor Yellow
Read-Host

# Check environment
Write-Host ""
Write-Host "Checking environment..." -ForegroundColor Yellow
if (-Not (Test-Path "apps\api\.env")) {
    Write-Host "ERROR: apps\api\.env not found" -ForegroundColor Red
    exit 1
}
Write-Host "OK" -ForegroundColor Green

# Generate Prisma Client
Write-Host ""
Write-Host "Generating Prisma Client..." -ForegroundColor Yellow
Set-Location packages\database
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Prisma generate failed" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}
Write-Host "OK" -ForegroundColor Green

# Database sync warning
Write-Host ""
Write-Host "WARNING: This will reset all database data!" -ForegroundColor Red
Write-Host "Continue? (y/n)" -NoNewline -ForegroundColor Yellow
$confirm = Read-Host
if ($confirm -ne "y") {
    Write-Host "Cancelled" -ForegroundColor Yellow
    Set-Location ..\..
    exit 0
}

# Push schema to database
Write-Host ""
Write-Host "Syncing database..." -ForegroundColor Yellow
npx prisma db push --force-reset --accept-data-loss
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Database sync failed" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}
Write-Host "OK" -ForegroundColor Green

# Regenerate client
Write-Host ""
Write-Host "Regenerating client..." -ForegroundColor Yellow
npx prisma generate
Write-Host "OK" -ForegroundColor Green

Set-Location ..\..

# Success
Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "Database fully synchronized!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps" -ForegroundColor Cyan
Write-Host "1. Create admin user in Prisma Studio" -ForegroundColor White
Write-Host "2. Run npm run dev:api" -ForegroundColor White
Write-Host "3. Run npm run dev:web" -ForegroundColor White
Write-Host ""
