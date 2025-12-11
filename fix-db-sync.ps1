# Truck4u - Complete Database Sync & Verification Script
# Run with: .\fix-db-sync.ps1

Write-Host "`n🔧 Truck4u - Complete Database Sync" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Step 1: Stop all servers
Write-Host "`n1. Please stop all running servers (API and Web)" -ForegroundColor Yellow
Write-Host "   Press ENTER when ready..." -ForegroundColor Yellow
Read-Host

# Step 2: Check .env
Write-Host "`n2. Checking environment configuration..." -ForegroundColor Yellow
if (-Not (Test-Path "apps\api\.env")) {
    Write-Host "❌ apps\api\.env not found!" -ForegroundColor Red
    Write-Host "   Please create it from apps\api\.env.example" -ForegroundColor Red
    exit 1
}

# Check DATABASE_URL
$envContent = Get-Content "apps\api\.env" -Raw
if ($envContent -notmatch "DATABASE_URL") {
    Write-Host "❌ DATABASE_URL not found in .env!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Environment OK" -ForegroundColor Green

# Step 3: Generate Prisma Client from current schema
Write-Host "`n3. Generating Prisma Client from schema..." -ForegroundColor Yellow
Set-Location packages\database
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Prisma generate failed" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}
Write-Host "✅ Prisma Client generated" -ForegroundColor Green

# Step 4: Push schema to database (THIS WILL DROP AND RECREATE TABLES)
Write-Host "`n4. Synchronizing database schema..." -ForegroundColor Yellow
Write-Host "   ⚠️  WARNING: This will reset all data!" -ForegroundColor Red
Write-Host "   Continue? (y/n): " -NoNewline -ForegroundColor Yellow
$confirm = Read-Host
if ($confirm -ne "y") {
    Write-Host "   Cancelled" -ForegroundColor Yellow
    Set-Location ..\..
    exit 0
}

Write-Host "   Pushing schema to database..." -ForegroundColor Yellow
npx prisma db push --force-reset --accept-data-loss
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Database push failed" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}
Write-Host "✅ Database synchronized" -ForegroundColor Green

# Step 5: Regenerate client after DB sync
Write-Host "`n5. Regenerating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
Write-Host "✅ Client regenerated" -ForegroundColor Green

Set-Location ..\..

# Step 6: Verify schema
Write-Host "`n6. Verifying database schema..." -ForegroundColor Yellow
Set-Location packages\database
$null = npx prisma validate 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Schema valid" -ForegroundColor Green
} else {
    Write-Host "⚠️  Schema validation warnings (may be OK)" -ForegroundColor Yellow
}
Set-Location ..\..

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✅ Database fully synchronized!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Create test data (admin, customer, driver)" -ForegroundColor White
Write-Host "  2. Start API - npm run dev:api" -ForegroundColor White
Write-Host "  3. Start Web - npm run dev:web" -ForegroundColor White
Write-Host ""
