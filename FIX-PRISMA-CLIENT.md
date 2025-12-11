# ⚠️ FIX URGENT - Régénération Prisma Client

## Problème

Le Prisma Client actuellement généré est **obsolète** et attend des noms de relations **capitalisés** (`Ride`, `Driver`), alors que le schéma utilise des noms **minuscules** (`ride`, `driver`).

**Erreurs:**
```
Unknown field `ride` for include statement on model `Payment`. Available options: Ride
Unknown field `driver` for include statement on model `DriverSubscription`. Available options: Driver
```

## Solution

### Étape 1: Régénérer le Prisma Client

**Sur Windows PowerShell:**

```powershell
# Aller dans le dossier database
cd packages\database

# Régénérer le client Prisma
npx prisma generate

# Retour à la racine
cd ..\..
```

### Étape 2: Redémarrer le serveur API

```powershell
# Arrêter le serveur (Ctrl+C)

# Relancer
npm run dev:api
```

### Étape 3: Vérifier que ça fonctionne

Les erreurs suivantes devraient disparaître:
- ✅ `[Auto-Confirm] Batch job failed`
- ✅ `[Subscription] Batch job failed`

Le serveur devrait démarrer avec:
```
✅ [Auto-Confirm] Starting batch job (runs every 2 minutes)...
✅ [Subscription] Starting expiration batch job (runs every hour)...
🚀 Server running on port 4000
📡 Socket.io ready for connections
```

## Pourquoi ce problème?

Le Prisma Client est un **fichier généré** à partir du schéma. Quand le schéma change (ou quand on clone un projet), il faut **toujours** régénérer le client avec `npx prisma generate`.

Dans votre cas, le client était généré à partir d'une version antérieure du schéma qui avait peut-être des noms différents.

## Commandes utiles

```powershell
# Régénérer le client
npx prisma generate

# Voir le schéma actuel
npx prisma format

# Synchroniser DB avec le schéma (⚠️ RESET data!)
npx prisma db push --force-reset
```

## Si npx prisma generate échoue

Si vous avez une erreur de réseau (403 Forbidden), essayez:

```powershell
# Option 1: Ignorer la validation checksum
$env:PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING="1"
npx prisma generate

# Option 2: Supprimer node_modules et réinstaller
Remove-Item -Recurse -Force node_modules
npm install --legacy-peer-deps
cd packages\database
npx prisma generate
```

## Après la régénération

Une fois le client régénéré et le serveur redémarré, tous les batch jobs devraient fonctionner sans erreur et l'application sera opérationnelle.
