# Script de vérification et correction du schéma Prisma
Write-Host "=== Vérification Configuration Prisma ===" -ForegroundColor Cyan

# 1. Vérifier le schéma Customer
Write-Host "`n1. Vérification du modèle Customer..." -ForegroundColor Yellow
Select-String -Path "packages\database\prisma\schema.prisma" -Pattern "model Customer" -Context 0,15

# 2. Vérifier l'id du Customer
Write-Host "`n2. Vérification de l'id Customer..." -ForegroundColor Yellow
Select-String -Path "packages\database\prisma\schema.prisma" -Pattern "^\s+id\s+String" -Context 0,0

# 3. Vérifier la version de Prisma
Write-Host "`n3. Version Prisma Client..." -ForegroundColor Yellow
npm list @prisma/client

# 4. Vérifier où est généré le client
Write-Host "`n4. Emplacement du client généré..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma\client") {
    Get-ChildItem "node_modules\.prisma\client\index.d.ts" | Select-Object FullName, LastWriteTime
} else {
    Write-Host "Client Prisma non trouvé!" -ForegroundColor Red
}

# 5. Vérifier le schéma.prisma pour @default
Write-Host "`n5. Recherche @default(uuid())..." -ForegroundColor Yellow
Select-String -Path "packages\database\prisma\schema.prisma" -Pattern "@default\(uuid\(\)\)" | Select-Object LineNumber, Line

Write-Host "`n=== Fin Vérification ===" -ForegroundColor Cyan
