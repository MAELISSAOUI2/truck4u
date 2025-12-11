# Truck4u - Complete Setup Script (PowerShell)
# Run with: .\setup.ps1

Write-Host "`n🚀 Truck4u - Complete Setup Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Check if .env files exist
Write-Host "`n1. Checking environment files..." -ForegroundColor Yellow
if (-Not (Test-Path "apps\api\.env")) {
    Write-Host "❌ apps\api\.env not found!" -ForegroundColor Red
    Write-Host "   Please create it from apps\api\.env.example" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Environment files OK" -ForegroundColor Green

# Clean install
Write-Host "`n2. Cleaning old installations..." -ForegroundColor Yellow
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules, package-lock.json
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue apps\web\node_modules, apps\web\package-lock.json
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue apps\api\node_modules, apps\api\package-lock.json
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue packages\database\node_modules, packages\database\package-lock.json
Write-Host "✅ Cleaned" -ForegroundColor Green

# Install dependencies
Write-Host "`n3. Installing dependencies (this may take a few minutes)..." -ForegroundColor Yellow
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Generate Prisma Client
Write-Host "`n4. Generating Prisma Client..." -ForegroundColor Yellow
Set-Location packages\database
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Prisma generate failed" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}
Set-Location ..\..
Write-Host "✅ Prisma Client generated" -ForegroundColor Green

# Check database connection
Write-Host "`n5. Checking database connection..." -ForegroundColor Yellow
Set-Location packages\database
$null = npx prisma db pull --force 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database connected" -ForegroundColor Green
} else {
    Write-Host "⚠️  Database connection failed (check DATABASE_URL in .env)" -ForegroundColor Yellow
}
Set-Location ..\..

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nNext steps:"
Write-Host "  1. Start API:  npm run dev:api"
Write-Host "  2. Start Web:  npm run dev:web"
Write-Host ""
