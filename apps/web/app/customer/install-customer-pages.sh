#!/bin/bash

# Truck4u - Script d'installation des pages Customer
# Ce script automatise l'installation de toutes les pages customer

echo "🚀 Installation des pages Customer pour Truck4u"
echo "================================================"
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -d "apps/web" ]; then
    echo "❌ Erreur: Le dossier apps/web n'existe pas"
    echo "   Assurez-vous d'exécuter ce script depuis la racine du projet"
    exit 1
fi

# Créer la structure de dossiers
echo "📁 Création de la structure de dossiers..."
mkdir -p apps/web/app/customer/register
mkdir -p apps/web/app/customer/new-ride
mkdir -p apps/web/app/customer/rides/\[id\]
mkdir -p apps/web/app/customer/profile

# Copier les fichiers (ajustez les chemins source selon où vous avez téléchargé les fichiers)
DOWNLOAD_PATH="$HOME/Downloads"  # Changez ceci si nécessaire

echo "📄 Copie des fichiers..."

if [ -f "$DOWNLOAD_PATH/customer-register-page.tsx" ]; then
    cp "$DOWNLOAD_PATH/customer-register-page.tsx" apps/web/app/customer/register/page.tsx
    echo "  ✅ register/page.tsx"
else
    echo "  ⚠️  customer-register-page.tsx non trouvé"
fi

if [ -f "$DOWNLOAD_PATH/customer-new-ride-page.tsx" ]; then
    cp "$DOWNLOAD_PATH/customer-new-ride-page.tsx" apps/web/app/customer/new-ride/page.tsx
    echo "  ✅ new-ride/page.tsx"
else
    echo "  ⚠️  customer-new-ride-page.tsx non trouvé"
fi

if [ -f "$DOWNLOAD_PATH/customer-rides-page.tsx" ]; then
    cp "$DOWNLOAD_PATH/customer-rides-page.tsx" apps/web/app/customer/rides/page.tsx
    echo "  ✅ rides/page.tsx"
else
    echo "  ⚠️  customer-rides-page.tsx non trouvé"
fi

if [ -f "$DOWNLOAD_PATH/customer-ride-details-page.tsx" ]; then
    cp "$DOWNLOAD_PATH/customer-ride-details-page.tsx" "apps/web/app/customer/rides/[id]/page.tsx"
    echo "  ✅ rides/[id]/page.tsx"
else
    echo "  ⚠️  customer-ride-details-page.tsx non trouvé"
fi

if [ -f "$DOWNLOAD_PATH/customer-profile-page.tsx" ]; then
    cp "$DOWNLOAD_PATH/customer-profile-page.tsx" apps/web/app/customer/profile/page.tsx
    echo "  ✅ profile/page.tsx"
else
    echo "  ⚠️  customer-profile-page.tsx non trouvé"
fi

# Nettoyer le cache Next.js
echo ""
echo "🧹 Nettoyage du cache Next.js..."
rm -rf apps/web/.next

echo ""
echo "✅ Installation terminée !"
echo ""
echo "📋 Pages installées:"
echo "  • /customer/register"
echo "  • /customer/new-ride"
echo "  • /customer/rides"
echo "  • /customer/rides/[id]"
echo "  • /customer/profile"
echo ""
echo "🚀 Pour lancer l'application:"
echo "  npm run dev:web"
echo ""
echo "🌐 Accédez ensuite à:"
echo "  http://localhost:3000"
echo ""
