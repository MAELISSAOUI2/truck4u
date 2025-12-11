# ========================================
# SOLUTION COMPLÈTE PRISMA CLIENT
# ========================================

Write-Host "=== Correction Complète Prisma Client ===" -ForegroundColor Cyan

# ÉTAPE 1: ARRÊTER TOUS LES PROCESSUS NODE
Write-Host "`n[1/6] Arrêt des processus Node.js..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Arrêt de $($nodeProcesses.Count) processus Node.js..." -ForegroundColor Red
    Stop-Process -Name node -Force
    Start-Sleep -Seconds 2
}

# ÉTAPE 2: NETTOYER LES FICHIERS GÉNÉRÉS
Write-Host "`n[2/6] Nettoyage des fichiers générés Prisma..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "node_modules\.prisma" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\@prisma\client" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "packages\database\node_modules" -ErrorAction SilentlyContinue
Write-Host "  ✓ Fichiers Prisma supprimés" -ForegroundColor Green

# ÉTAPE 3: RÉINSTALLER LES DÉPENDANCES
Write-Host "`n[3/6] Réinstallation des dépendances..." -ForegroundColor Yellow
npm install --legacy-peer-deps
Write-Host "  ✓ Dépendances installées" -ForegroundColor Green

# ÉTAPE 4: RÉGÉNÉRER LE CLIENT PRISMA
Write-Host "`n[4/6] Régénération du client Prisma..." -ForegroundColor Yellow
Set-Location "packages\database"
npx prisma generate
Set-Location "..\..\"
Write-Host "  ✓ Client Prisma régénéré" -ForegroundColor Green

# ÉTAPE 5: VÉRIFIER LA GÉNÉRATION
Write-Host "`n[5/6] Vérification du client généré..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma\client\index.d.ts") {
    $clientFile = Get-Item "node_modules\.prisma\client\index.d.ts"
    Write-Host "  ✓ Client trouvé: $($clientFile.FullName)" -ForegroundColor Green
    Write-Host "  ✓ Date de modification: $($clientFile.LastWriteTime)" -ForegroundColor Green

    # Vérifier si le client a les bons types
    $hasUuidDefault = Select-String -Path "node_modules\.prisma\client\index.d.ts" -Pattern "id\?" -Quiet
    if ($hasUuidDefault) {
        Write-Host "  ✓ Le client a l'id optionnel (bon signe)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Le client n'a pas l'id optionnel" -ForegroundColor Red
    }
} else {
    Write-Host "  ✗ Client Prisma NON TROUVÉ!" -ForegroundColor Red
    exit 1
}

# ÉTAPE 6: INSTRUCTIONS FINALES
Write-Host "`n[6/6] Configuration terminée!" -ForegroundColor Green
Write-Host "`nVous pouvez maintenant:" -ForegroundColor Cyan
Write-Host "  1. Démarrer le serveur: npm run dev:api" -ForegroundColor White
Write-Host "  2. Tester l'inscription client" -ForegroundColor White

Write-Host "`n=== Script Terminé ===" -ForegroundColor Cyan
