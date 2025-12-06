# Configuration du Stockage des Documents KYC

## Vue d'ensemble

Le système de stockage des documents KYC est flexible et supporte trois modes:

1. **Local** (développement) - Stockage sur le disque local
2. **Cloudflare R2** (production recommandée) - Stockage S3-compatible de Cloudflare
3. **AWS S3** (production alternative) - Stockage AWS S3

## Architecture

```
┌─────────────────┐
│  Client Upload  │
└────────┬────────┘
         │
    ┌────▼────┐
    │  Multer │ (Memory Storage)
    └────┬────┘
         │
    ┌────▼─────────┐
    │ Storage      │
    │ Service      │
    └────┬─────────┘
         │
    ┌────▼────┬──────┬──────┐
    │  Local  │  R2  │  S3  │
    └─────────┴──────┴──────┘
```

## Configuration

### 1. Mode Local (Développement)

**Fichier `.env` :**
```bash
STORAGE_PROVIDER=local
```

**Avantages:**
- Aucune configuration supplémentaire
- Gratuit
- Rapide pour le développement

**Inconvénients:**
- Ne fonctionne pas avec plusieurs serveurs
- Pas de backup automatique
- Fichiers perdus si le serveur redémarre (conteneurs Docker)

**Stockage:**
- Dossier: `apps/api/uploads/kyc/{driverId}/`
- URLs: `http://localhost:4000/uploads/kyc/{driverId}/{filename}`

---

### 2. Cloudflare R2 (Production Recommandée) ⭐

Cloudflare R2 est compatible S3 sans frais de sortie de données.

#### Étape 1: Créer un compte Cloudflare R2

1. Aller sur https://dash.cloudflare.com/
2. Naviguer vers **R2 Object Storage**
3. Créer un nouveau bucket: `truck4u-documents`

#### Étape 2: Créer des API Tokens

1. Dans R2, aller à **Manage R2 API Tokens**
2. Cliquer sur **Create API Token**
3. **Permissions**: `Object Read & Write`
4. **TTL**: Jamais
5. Copier:
   - Access Key ID
   - Secret Access Key
   - Account ID (dans l'URL du dashboard)

#### Étape 3: Configurer le Bucket

**Option A: Bucket Privé (Recommandé)**
- Documents accessibles uniquement via URLs signées
- Plus sécurisé
- Pas de configuration CORS nécessaire

**Option B: Bucket Public**
1. Dans les paramètres du bucket: **Settings** → **Public Access**
2. Activer **Allow Public Access**
3. Configurer un domaine personnalisé (optionnel):
   - **Settings** → **Custom Domains**
   - Ajouter: `cdn.truck4u.tn`
   - Mettre à jour les DNS selon les instructions

#### Étape 4: Configuration .env

**Bucket Privé:**
```bash
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_here
R2_SECRET_ACCESS_KEY=your_secret_key_here
R2_BUCKET_NAME=truck4u-documents
# R2_PUBLIC_URL non défini = URLs signées automatiquement
```

**Bucket Public avec CDN:**
```bash
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_here
R2_SECRET_ACCESS_KEY=your_secret_key_here
R2_BUCKET_NAME=truck4u-documents
R2_PUBLIC_URL=https://cdn.truck4u.tn
```

**Pricing R2:**
- Stockage: $0.015/GB/mois
- Opérations Classe A (upload): $4.50/million
- Opérations Classe B (download): $0.36/million
- **Pas de frais de sortie de données** (vs $0.09/GB pour S3)

**Exemple de coûts mensuels:**
- 10 000 documents KYC (moyenne 2 MB) = 20 GB
- 50 000 uploads/mois
- 200 000 téléchargements/mois

**Coût estimé:**
- Stockage: 20 GB × $0.015 = $0.30
- Uploads: 50,000 / 1,000,000 × $4.50 = $0.23
- Downloads: 200,000 / 1,000,000 × $0.36 = $0.07
- **Total: ~$0.60/mois**

---

### 3. AWS S3 (Production Alternative)

#### Configuration

```bash
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=eu-west-1
S3_BUCKET_NAME=truck4u-documents
S3_PUBLIC_URL=https://cdn.truck4u.tn  # Optionnel (CloudFront)
```

**Pricing S3:**
- Stockage: $0.023/GB/mois
- Requêtes PUT: $0.005/1000
- Requêtes GET: $0.0004/1000
- **Transfert sortie: $0.09/GB** (coûteux!)

**Même exemple que R2:**
- Stockage: $0.46
- Uploads: $0.25
- Downloads: $0.08
- **Transfert sortie: 200k × 2MB = 400GB × $0.09 = $36**
- **Total: ~$37/mois** (vs $0.60 avec R2!)

---

## Installation des dépendances

Sur **Windows** (votre machine):

```bash
cd apps/api
npm install --legacy-peer-deps
```

Cela installera automatiquement:
- `@aws-sdk/client-s3@^3.928.0`
- `@aws-sdk/s3-request-presigner@^3.928.0`

---

## Utilisation dans le Code

Le service de stockage est utilisé automatiquement par les routes KYC.

**Exemple d'upload:**
```typescript
import { storageService } from '../services/storage';

const uploadResult = await storageService.upload(
  buffer,           // Buffer du fichier
  'document.jpg',   // Nom original
  {
    folder: 'kyc/driver-id',  // Dossier dans le bucket
    contentType: 'image/jpeg', // Type MIME
    isPublic: false            // Privé ou public
  }
);

// uploadResult contient:
// - url: URL complète du fichier
// - key: Clé du fichier dans le bucket
// - size: Taille en bytes
// - contentType: Type MIME
```

**Exemple de suppression:**
```typescript
await storageService.delete('kyc/driver-id/document.jpg');
```

**Exemple d'URL signée:**
```typescript
// Générer une URL valide 1 heure (3600 secondes)
const signedUrl = await storageService.getSignedUrl(
  'kyc/driver-id/document.jpg',
  3600
);
```

---

## URLs de Documents

### Mode Local
```
http://localhost:4000/uploads/kyc/{driverId}/{filename}
```

### Mode R2/S3 avec Bucket Public
```
https://cdn.truck4u.tn/kyc/{driverId}/{filename}
```

### Mode R2/S3 avec Bucket Privé
```
https://{account-id}.r2.cloudflarestorage.com/truck4u-documents/kyc/{driverId}/{filename}?X-Amz-...
```

Les URLs signées sont valides 7 jours par défaut.

---

## Migration Local → Cloud

### Étape 1: Configurer R2
Suivre les instructions ci-dessus.

### Étape 2: Mettre à jour .env
Changer `STORAGE_PROVIDER=local` → `STORAGE_PROVIDER=r2`

### Étape 3: Migrer les fichiers existants

**Script de migration** (à créer si nécessaire):
```bash
# Copier tous les fichiers du dossier local vers R2
aws s3 sync ./uploads/kyc/ s3://truck4u-documents/kyc/ \
  --endpoint-url https://{account-id}.r2.cloudflarestorage.com
```

Ou utiliser [Rclone](https://rclone.org/) qui supporte R2.

### Étape 4: Redémarrer le serveur
```bash
npm run dev  # ou pm2 restart
```

---

## Sécurité

### Buckets Privés vs Publics

**Privé (Recommandé):**
✅ Documents accessibles uniquement avec URLs signées
✅ Contrôle d'accès total
✅ URLs expirent automatiquement
❌ URLs plus longues

**Public:**
✅ URLs courtes et propres
✅ Meilleure performance (pas de génération de signature)
❌ N'importe qui avec l'URL peut accéder au document
❌ Pas de contrôle d'accès

**Recommandation:** Utiliser bucket **privé** pour documents KYC (données sensibles).

### Types de Fichiers Autorisés

Le système accepte uniquement:
- `image/jpeg`
- `image/png`
- `image/jpg`
- `application/pdf`

Taille max: **10 MB**

### CORS Configuration

Si vous utilisez un bucket public et que le frontend doit accéder directement aux fichiers:

**R2 CORS Configuration:**
```json
[
  {
    "AllowedOrigins": ["https://truck4u.tn", "http://localhost:3000"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

---

## Debugging

### Vérifier le provider actuel
```typescript
console.log('Storage provider:', storageService.getProvider());
```

### Logs
Le service affiche dans la console au démarrage:
- ✅ `Cloudflare R2 storage initialized` (succès)
- ⚠️  `R2 credentials not configured, falling back to local storage` (échec)

### Tester l'upload
```bash
curl -X POST http://localhost:4000/api/kyc/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/test.jpg" \
  -F "documentType=CIN_FRONT"
```

---

## Recommandations Production

1. **Utiliser R2** (pas S3) pour économiser sur les frais de sortie
2. **Bucket privé** pour documents KYC
3. **Domaine personnalisé** pour URLs propres (optionnel)
4. **Backup automatique** via Cloudflare (inclus)
5. **Monitoring** via Cloudflare Analytics
6. **Lifecycle policy** pour supprimer les documents rejetés après 30 jours

---

## Support

Pour toute question sur la configuration du stockage:
- Documentation R2: https://developers.cloudflare.com/r2/
- Documentation S3: https://docs.aws.amazon.com/s3/
