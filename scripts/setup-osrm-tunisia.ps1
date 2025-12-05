# Script PowerShell pour configurer OSRM avec les données de Tunisia
# Usage: .\scripts\setup-osrm-tunisia.ps1

Write-Host "🗺️  Configuration OSRM pour Tunisia" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Créer le dossier de données
if (-Not (Test-Path "osrm-data")) {
    New-Item -ItemType Directory -Path "osrm-data" | Out-Null
}

Set-Location osrm-data

# Télécharger les données OSM Tunisia si pas déjà présentes
if (-Not (Test-Path "tunisia-latest.osm.pbf")) {
    Write-Host "📥 Téléchargement des données OSM Tunisia (~100MB)..." -ForegroundColor Yellow

    # Utiliser Invoke-WebRequest (disponible par défaut sur Windows)
    $url = "https://download.geofabrik.de/africa/tunisia-latest.osm.pbf"
    $output = "tunisia-latest.osm.pbf"

    try {
        # Afficher la progression
        $ProgressPreference = 'Continue'
        Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
        Write-Host "✅ Téléchargement terminé" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Erreur lors du téléchargement: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Alternative: Téléchargez manuellement depuis:" -ForegroundColor Yellow
        Write-Host "  $url"
        Write-Host "Et placez le fichier dans le dossier osrm-data/" -ForegroundColor Yellow
        Set-Location ..
        exit 1
    }
}
else {
    Write-Host "✅ Fichier tunisia-latest.osm.pbf déjà présent" -ForegroundColor Green
}

# Obtenir le chemin absolu pour Docker
$currentPath = (Get-Location).Path

# Extraction des données (si pas déjà fait)
if (-Not (Test-Path "tunisia-latest.osrm")) {
    Write-Host "🔧 Extraction des données OSRM (peut prendre 5-10 minutes)..." -ForegroundColor Yellow
    docker run --rm -v "${currentPath}:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/tunisia-latest.osm.pbf

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Extraction terminée" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Erreur lors de l'extraction" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}
else {
    Write-Host "✅ Fichiers .osrm déjà présents" -ForegroundColor Green
}

# Partitionnement (si pas déjà fait)
if (-Not (Test-Path "tunisia-latest.osrm.mldgr")) {
    Write-Host "📊 Partitionnement des données..." -ForegroundColor Yellow
    docker run --rm -v "${currentPath}:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/tunisia-latest.osrm

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Partitionnement terminé" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Erreur lors du partitionnement" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}
else {
    Write-Host "✅ Fichiers .osrm.mldgr déjà présents" -ForegroundColor Green
}

# Customisation (si pas déjà fait)
if (-Not (Test-Path "tunisia-latest.osrm.hsgr")) {
    Write-Host "⚙️  Customisation des données..." -ForegroundColor Yellow
    docker run --rm -v "${currentPath}:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/tunisia-latest.osrm

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Customisation terminée" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Erreur lors de la customisation" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}
else {
    Write-Host "✅ Fichiers .osrm.hsgr déjà présents" -ForegroundColor Green
}

Set-Location ..

Write-Host ""
Write-Host "✅ OSRM configuré avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Pour démarrer OSRM:" -ForegroundColor Cyan
Write-Host "   docker-compose -f docker-compose.osrm.yml up -d"
Write-Host ""
Write-Host "🧪 Pour tester:" -ForegroundColor Cyan
Write-Host "   curl 'http://localhost:5000/route/v1/driving/10.1815,36.8065;10.1814,36.7923?overview=full'"
Write-Host ""
