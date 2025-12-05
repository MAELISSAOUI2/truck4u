# Script PowerShell pour configurer OSRM avec les donnees de Tunisia
# Usage: .\scripts\setup-osrm-tunisia.ps1

Write-Host "Configuration OSRM pour Tunisia" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

# Creer le dossier de donnees
if (-Not (Test-Path "osrm-data")) {
    New-Item -ItemType Directory -Path "osrm-data" | Out-Null
}

Set-Location osrm-data

# Telecharger les donnees OSM Tunisia si pas deja presentes
if (-Not (Test-Path "tunisia-latest.osm.pbf")) {
    Write-Host "Telechargement des donnees OSM Tunisia (~100MB)..." -ForegroundColor Yellow

    # Utiliser Invoke-WebRequest (disponible par defaut sur Windows)
    $url = "https://download.geofabrik.de/africa/tunisia-latest.osm.pbf"
    $output = "tunisia-latest.osm.pbf"

    try {
        # Afficher la progression
        $ProgressPreference = 'Continue'
        Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
        Write-Host "Telechargement termine" -ForegroundColor Green
    }
    catch {
        Write-Host "Erreur lors du telechargement: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Alternative: Telechargez manuellement depuis:" -ForegroundColor Yellow
        Write-Host "  $url"
        Write-Host "Et placez le fichier dans le dossier osrm-data/" -ForegroundColor Yellow
        Set-Location ..
        exit 1
    }
}
else {
    Write-Host "Fichier tunisia-latest.osm.pbf deja present" -ForegroundColor Green
}

# Obtenir le chemin absolu pour Docker
$currentPath = (Get-Location).Path
Write-Host "Chemin des donnees: $currentPath" -ForegroundColor Gray

# Extraction des donnees (si pas deja fait)
if (-Not (Test-Path "tunisia-latest.osrm")) {
    Write-Host "Extraction des donnees OSRM (peut prendre 5-10 minutes)..." -ForegroundColor Yellow
    docker run --rm -v "${currentPath}:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/tunisia-latest.osm.pbf

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Extraction terminee" -ForegroundColor Green
    }
    else {
        Write-Host "Erreur lors de l'extraction" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}
else {
    Write-Host "Fichiers .osrm deja presents" -ForegroundColor Green
}

# Partitionnement (si pas deja fait)
if (-Not (Test-Path "tunisia-latest.osrm.mldgr")) {
    Write-Host "Partitionnement des donnees..." -ForegroundColor Yellow
    docker run --rm -v "${currentPath}:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/tunisia-latest.osrm

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Partitionnement termine" -ForegroundColor Green
    }
    else {
        Write-Host "Erreur lors du partitionnement" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}
else {
    Write-Host "Fichiers .osrm.mldgr deja presents" -ForegroundColor Green
}

# Customisation (si pas deja fait)
if (-Not (Test-Path "tunisia-latest.osrm.hsgr")) {
    Write-Host "Customisation des donnees..." -ForegroundColor Yellow
    docker run --rm -v "${currentPath}:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/tunisia-latest.osrm

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Customisation terminee" -ForegroundColor Green
    }
    else {
        Write-Host "Erreur lors de la customisation" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}
else {
    Write-Host "Fichiers .osrm.hsgr deja presents" -ForegroundColor Green
}

Set-Location ..

Write-Host ""
Write-Host "OSRM configure avec succes!" -ForegroundColor Green
Write-Host ""
Write-Host "Pour demarrer OSRM:" -ForegroundColor Cyan
Write-Host "   docker-compose -f docker-compose.osrm.yml up -d"
Write-Host ""
Write-Host "Pour tester:" -ForegroundColor Cyan
Write-Host "   curl 'http://localhost:5000/route/v1/driving/10.1815,36.8065;10.1814,36.7923?overview=full'"
Write-Host ""
