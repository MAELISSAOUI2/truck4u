# 📋 Plan d'implémentation : KYC + Back Office Admin

## ✅ Fonctionnalité 1 : Notifications géographiques - **TERMINÉE**

### Ce qui a été fait :
- ✅ Modification de `dispatchToDrivers()` dans `apps/api/src/routes/rides.ts`
- ✅ Notification immédiate de TOUS les conducteurs dans un rayon de 100km
- ✅ Calcul de la distance de chaque conducteur au point de départ
- ✅ Logs détaillés pour monitoring
- ✅ Commit: `91d91e9` - "Add geographic notification system for drivers (100km radius)"

---

## 🔄 Fonctionnalité 2 : KYC pour conducteurs (Style Revolut)

### Vue d'ensemble
Système de vérification KYC complet en plusieurs étapes avant que le conducteur puisse accéder à la plateforme.

### Documents requis
1. **CIN (recto/verso)** - Carte d'identité nationale
2. **Permis de conduire** - Licence de conduire valide
3. **Assurance véhicule** - Attestation d'assurance en cours
4. **Attestation fiscale** - Patente ou attestation de taxe professionnelle
5. **Vérification faciale** - Photo du visage pour matching avec CIN

### Statuts KYC (nouveau enum)
```prisma
enum KYCStatus {
  NOT_STARTED      // Inscription faite, KYC pas commencé
  DOCUMENTS_PENDING // En cours d'upload des documents
  FACE_VERIFICATION_PENDING // Documents uploadés, en attente vérif faciale
  UNDER_REVIEW     // En révision par admin
  APPROVED         // Approuvé, peut accéder
  REJECTED         // Rejeté, doit recommencer
  REVISION_REQUESTED // Admin demande corrections
}
```

---

## 📐 Architecture technique KYC

### 1. **Modifications Schema Prisma**

#### Nouveau model `DriverKYC`
```prisma
model DriverKYC {
  id                    String    @id @default(uuid())
  driverId              String    @unique
  status                KYCStatus @default(NOT_STARTED)

  // Documents
  cinFront              String?   // S3 URL
  cinBack               String?   // S3 URL
  drivingLicense        String?   // S3 URL
  vehicleInsurance      String?   // S3 URL
  taxAttestation        String?   // S3 URL
  facialPhoto           String?   // S3 URL

  // Extraction automatique (OCR optionnel)
  extractedCinNumber    String?
  extractedCinName      String?
  extractedLicenseNumber String?

  // Vérification faciale
  faceMatchScore        Float?    // Score de matching (0-100)
  faceMatchStatus       FaceMatchStatus?

  // Admin review
  reviewedBy            String?   // Admin ID
  reviewedAt            DateTime?
  rejectionReason       String?   @db.Text
  revisionNotes         String?   @db.Text

  // Timestamps
  documentsSubmittedAt  DateTime?
  faceVerifiedAt        DateTime?
  approvedAt            DateTime?

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  driver                Driver    @relation(fields: [driverId], references: [id])

  @@index([status])
  @@index([reviewedAt])
}

enum FaceMatchStatus {
  NOT_VERIFIED
  VERIFIED
  FAILED
  MANUAL_REVIEW_REQUIRED
}
```

#### Modification model `Driver`
```prisma
model Driver {
  // ... champs existants

  kycStatus             KYCStatus @default(NOT_STARTED)
  kyc                   DriverKYC?

  // ... reste inchangé
}
```

---

### 2. **Backend - Routes API**

#### Fichier : `apps/api/src/routes/driver-kyc.ts` (NOUVEAU)

```typescript
import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireDriverAuth } from '../middleware/auth';
import multer from 'multer';
import { uploadToS3 } from '../services/s3';
import { verifyFace } from '../services/face-verification';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/driver/kyc/status - Get KYC status
router.get('/status', verifyToken, requireDriverAuth, async (req, res, next) => {
  // Return current KYC status and documents
});

// POST /api/driver/kyc/upload-cin - Upload CIN (front)
router.post('/upload-cin-front', verifyToken, requireDriverAuth, upload.single('file'), async (req, res, next) => {
  // Upload to S3
  // Update DriverKYC
  // Optional: OCR extraction
});

// POST /api/driver/kyc/upload-cin-back - Upload CIN (back)
router.post('/upload-cin-back', verifyToken, requireDriverAuth, upload.single('file'), async (req, res, next) => {
  // Upload to S3
  // Update DriverKYC
});

// POST /api/driver/kyc/upload-license - Upload driving license
router.post('/upload-license', verifyToken, requireDriverAuth, upload.single('file'), async (req, res, next) => {
  // Upload to S3
  // Update DriverKYC
  // Optional: OCR extraction
});

// POST /api/driver/kyc/upload-insurance - Upload insurance
router.post('/upload-insurance', verifyToken, requireDriverAuth, upload.single('file'), async (req, res, next) => {
  // Upload to S3
  // Update DriverKYC
});

// POST /api/driver/kyc/upload-tax - Upload tax attestation
router.post('/upload-tax', verifyToken, requireDriverAuth, upload.single('file'), async (req, res, next) => {
  // Upload to S3
  // Update DriverKYC
});

// POST /api/driver/kyc/facial-verification - Upload facial photo and verify
router.post('/facial-verification', verifyToken, requireDriverAuth, upload.single('photo'), async (req, res, next) => {
  // Upload to S3
  // Call face verification service (AWS Rekognition / Face++)
  // Compare with CIN photo
  // Update faceMatchScore and faceMatchStatus
  // If score > 80%, auto-approve. If < 60%, reject. Between: manual review
});

// POST /api/driver/kyc/submit - Mark KYC as submitted for review
router.post('/submit', verifyToken, requireDriverAuth, async (req, res, next) => {
  // Verify all documents uploaded
  // Update status to UNDER_REVIEW
  // Notify admins
});

export default router;
```

#### Service S3 : `apps/api/src/services/s3.ts` (NOUVEAU)
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function uploadToS3(
  file: Express.Multer.File,
  folder: string
): Promise<string> {
  // Compress image with sharp
  const compressedBuffer = await sharp(file.buffer)
    .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const key = `${folder}/${uuidv4()}.jpg`;

  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    Body: compressedBuffer,
    ContentType: 'image/jpeg',
    ACL: 'private'
  }));

  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
```

#### Service Face Verification : `apps/api/src/services/face-verification.ts` (NOUVEAU)
```typescript
import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition';
import axios from 'axios';

const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function verifyFace(
  cinPhotoUrl: string,
  selfieUrl: string
): Promise<{ score: number; status: string }> {
  // Download both images
  const [cinBuffer, selfieBuffer] = await Promise.all([
    downloadImage(cinPhotoUrl),
    downloadImage(selfieUrl)
  ]);

  // Use AWS Rekognition to compare faces
  const command = new CompareFacesCommand({
    SourceImage: { Bytes: cinBuffer },
    TargetImage: { Bytes: selfieBuffer },
    SimilarityThreshold: 60
  });

  const response = await rekognitionClient.send(command);

  if (!response.FaceMatches || response.FaceMatches.length === 0) {
    return { score: 0, status: 'FAILED' };
  }

  const similarity = response.FaceMatches[0].Similarity || 0;

  let status = 'MANUAL_REVIEW_REQUIRED';
  if (similarity >= 85) status = 'VERIFIED';
  if (similarity < 60) status = 'FAILED';

  return { score: similarity, status };
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}
```

---

### 3. **Frontend - Pages KYC**

#### Structure des pages
```
apps/web/app/driver/kyc/
├── page.tsx                    // Hub principal KYC
├── documents/
│   ├── cin/page.tsx           // Upload CIN
│   ├── license/page.tsx       // Upload permis
│   ├── insurance/page.tsx     // Upload assurance
│   └── tax/page.tsx           // Upload attestation fiscale
├── facial-verification/
│   └── page.tsx               // Vérification faciale
└── review/page.tsx            // Récapitulatif avant soumission
```

#### Exemple : `apps/web/app/driver/kyc/page.tsx`
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Stepper, Button, Progress, Text } from '@mantine/core';
import { IconFileUpload, IconCamera, IconCheck } from '@tabler/icons-react';

const KYC_STEPS = [
  { label: 'CIN', icon: IconFileUpload, path: '/driver/kyc/documents/cin' },
  { label: 'Permis', icon: IconFileUpload, path: '/driver/kyc/documents/license' },
  { label: 'Assurance', icon: IconFileUpload, path: '/driver/kyc/documents/insurance' },
  { label: 'Attestation fiscale', icon: IconFileUpload, path: '/driver/kyc/documents/tax' },
  { label: 'Vérification faciale', icon: IconCamera, path: '/driver/kyc/facial-verification' },
  { label: 'Révision', icon: IconCheck, path: '/driver/kyc/review' }
];

export default function KYCPage() {
  const router = useRouter();
  const [kycStatus, setKycStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKYCStatus();
  }, []);

  const loadKYCStatus = async () => {
    // GET /api/driver/kyc/status
    // setKycStatus(...)
  };

  const calculateProgress = () => {
    // Calculate based on uploaded documents
    return 0;
  };

  return (
    <Container>
      <Title>Vérification de votre compte</Title>
      <Text>Complétez ces étapes pour accéder à la plateforme</Text>

      <Progress value={calculateProgress()} mt="xl" size="xl" />

      <Stepper active={currentStep} mt="xl">
        {KYC_STEPS.map((step, index) => (
          <Stepper.Step
            key={index}
            label={step.label}
            icon={<step.icon />}
            completedIcon={<IconCheck />}
          />
        ))}
      </Stepper>

      <Stack gap="md" mt="xl">
        {KYC_STEPS.map((step, index) => (
          <Card key={index}>
            <Group justify="space-between">
              <Text>{step.label}</Text>
              <Button onClick={() => router.push(step.path)}>
                {isStepComplete(index) ? 'Voir' : 'Commencer'}
              </Button>
            </Group>
          </Card>
        ))}
      </Stack>
    </Container>
  );
}
```

#### Middleware : Bloquer accès si KYC incomplet
```typescript
// apps/web/middleware.ts
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Driver routes that require KYC
  if (path.startsWith('/driver') && !path.startsWith('/driver/kyc')) {
    // Check if user has completed KYC
    // If not, redirect to /driver/kyc
  }
}
```

---

## 🏢 Fonctionnalité 3 : Back Office Admin

### Vue d'ensemble
Interface d'administration pour gérer les conducteurs et vérifier les documents KYC.

### Fonctionnalités requises
1. **Dashboard** : Vue d'ensemble (conducteurs en attente, approuvés, rejetés)
2. **Liste conducteurs** : Filtres par statut KYC, recherche
3. **Détail conducteur** : Voir tous les documents, historique
4. **Révision KYC** : Approuver/Rejeter/Demander corrections
5. **Logs d'activité** : Traçabilité des actions admin

---

## 📐 Architecture technique Back Office

### 1. **Schema Prisma - Ajouts**

#### Nouveau model `Admin`
```prisma
model Admin {
  id                   String    @id @default(uuid())
  email                String    @unique
  name                 String
  role                 AdminRole @default(REVIEWER)
  passwordHash         String
  isActive             Boolean   @default(true)
  lastLoginAt          DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  activityLogs         AdminActivityLog[]

  @@index([email])
  @@index([role, isActive])
}

enum AdminRole {
  SUPER_ADMIN
  REVIEWER
  SUPPORT
}

model AdminActivityLog {
  id                   String    @id @default(uuid())
  adminId              String
  action               String    // "APPROVED_KYC", "REJECTED_KYC", "REQUESTED_REVISION"
  targetType           String    // "DRIVER", "RIDE", etc.
  targetId             String
  details              Json?     // Additional context
  ipAddress            String?
  userAgent            String?
  createdAt            DateTime  @default(now())

  admin                Admin     @relation(fields: [adminId], references: [id])

  @@index([adminId, createdAt])
  @@index([targetType, targetId])
}
```

### 2. **Backend - Routes Admin**

#### Fichier : `apps/api/src/routes/admin.ts` (NOUVEAU)
```typescript
import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireAdmin } from '../middleware/auth';

const router = Router();

// POST /api/admin/login - Admin login
router.post('/login', async (req, res, next) => {
  // Verify email/password
  // Generate JWT with role
});

// GET /api/admin/dashboard/stats - Dashboard statistics
router.get('/dashboard/stats', verifyToken, requireAdmin, async (req, res, next) => {
  // Return counts: pending KYC, approved, rejected, etc.
});

// GET /api/admin/drivers - List all drivers with filters
router.get('/drivers', verifyToken, requireAdmin, async (req, res, next) => {
  // Filter by: kycStatus, verificationStatus, search query
  // Pagination
});

// GET /api/admin/drivers/:id - Get driver details
router.get('/drivers/:id', verifyToken, requireAdmin, async (req, res, next) => {
  // Return full driver + KYC data
});

// POST /api/admin/drivers/:id/kyc/approve - Approve KYC
router.post('/drivers/:id/kyc/approve', verifyToken, requireAdmin, async (req, res, next) => {
  // Update KYCStatus to APPROVED
  // Update Driver.verificationStatus to APPROVED
  // Log activity
  // Send notification to driver
});

// POST /api/admin/drivers/:id/kyc/reject - Reject KYC
router.post('/drivers/:id/kyc/reject', verifyToken, requireAdmin, async (req, res, next) => {
  // Update KYCStatus to REJECTED
  // Store rejection reason
  // Log activity
  // Send notification to driver
});

// POST /api/admin/drivers/:id/kyc/request-revision - Request corrections
router.post('/drivers/:id/kyc/request-revision', verifyToken, requireAdmin, async (req, res, next) => {
  // Update KYCStatus to REVISION_REQUESTED
  // Store notes
  // Log activity
  // Send notification to driver
});

// GET /api/admin/activity-logs - Activity logs
router.get('/activity-logs', verifyToken, requireAdmin, async (req, res, next) => {
  // Pagination
  // Filter by admin, action, date range
});

export default router;
```

#### Middleware Admin : `apps/api/src/middleware/auth.ts` (AJOUT)
```typescript
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
```

### 3. **Frontend - Back Office**

#### Structure des pages
```
apps/web/app/admin/
├── login/page.tsx              // Login admin
├── dashboard/page.tsx          // Dashboard principal
├── drivers/
│   ├── page.tsx               // Liste conducteurs
│   └── [id]/
│       ├── page.tsx           // Détail conducteur
│       └── kyc-review/page.tsx // Révision KYC
└── logs/page.tsx              // Activity logs
```

#### Exemple : `apps/web/app/admin/drivers/[id]/kyc-review/page.tsx`
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Image, Button, Textarea, Stack, Modal } from '@mantine/core';

export default function KYCReviewPage() {
  const params = useParams();
  const [driver, setDriver] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    await fetch(`/api/admin/drivers/${params.id}/kyc/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    // Show success notification
    router.push('/admin/drivers');
  };

  const handleReject = async () => {
    await fetch(`/api/admin/drivers/${params.id}/kyc/reject`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: rejectionReason })
    });
    // Show success notification
    router.push('/admin/drivers');
  };

  return (
    <Container>
      <Title>Révision KYC - {driver?.name}</Title>

      <Grid>
        <Grid.Col span={6}>
          <Card>
            <Text fw={600}>CIN (Recto)</Text>
            <Image src={driver?.kyc?.cinFront} />
          </Card>
        </Grid.Col>

        <Grid.Col span={6}>
          <Card>
            <Text fw={600}>CIN (Verso)</Text>
            <Image src={driver?.kyc?.cinBack} />
          </Card>
        </Grid.Col>

        <Grid.Col span={6}>
          <Card>
            <Text fw={600}>Permis de conduire</Text>
            <Image src={driver?.kyc?.drivingLicense} />
          </Card>
        </Grid.Col>

        <Grid.Col span={6}>
          <Card>
            <Text fw={600}>Assurance</Text>
            <Image src={driver?.kyc?.vehicleInsurance} />
          </Card>
        </Grid.Col>

        <Grid.Col span={6}>
          <Card>
            <Text fw={600}>Attestation fiscale</Text>
            <Image src={driver?.kyc?.taxAttestation} />
          </Card>
        </Grid.Col>

        <Grid.Col span={6}>
          <Card>
            <Text fw={600}>Photo faciale</Text>
            <Image src={driver?.kyc?.facialPhoto} />
            <Text>Score de matching: {driver?.kyc?.faceMatchScore}%</Text>
            <Badge color={driver?.kyc?.faceMatchStatus === 'VERIFIED' ? 'green' : 'orange'}>
              {driver?.kyc?.faceMatchStatus}
            </Badge>
          </Card>
        </Grid.Col>
      </Grid>

      <Group justify="flex-end" mt="xl">
        <Button color="red" onClick={() => setShowRejectModal(true)}>
          Rejeter
        </Button>
        <Button color="orange" onClick={() => setShowRevisionModal(true)}>
          Demander correction
        </Button>
        <Button color="green" onClick={handleApprove}>
          Approuver
        </Button>
      </Group>

      {/* Modals for reject/revision */}
    </Container>
  );
}
```

---

## 📦 Dépendances à installer

### Backend
```bash
npm install --save @aws-sdk/client-s3 @aws-sdk/client-rekognition
npm install --save multer @types/multer
npm install --save sharp
```

### Frontend
```bash
npm install --save react-webcam  # Pour capture webcam
npm install --save react-dropzone  # Pour upload de fichiers
```

---

## 🔒 Variables d'environnement

### `.env` (Backend)
```bash
# AWS S3
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=truck4u-documents

# Admin
ADMIN_JWT_SECRET=your_admin_jwt_secret
```

---

## 🧪 Plan de test

### KYC Workflow
1. ✅ Conducteur créé → status = NOT_STARTED
2. ✅ Upload CIN recto → S3 URL enregistré
3. ✅ Upload CIN verso → S3 URL enregistré
4. ✅ Upload permis, assurance, attestation fiscale
5. ✅ Upload photo faciale → AWS Rekognition compare avec CIN
6. ✅ Score > 85% → Auto APPROVED
7. ✅ Score 60-85% → MANUAL_REVIEW_REQUIRED
8. ✅ Score < 60% → FAILED
9. ✅ Admin révise → Approve/Reject/Revision
10. ✅ Conducteur reçoit notification

### Back Office
1. ✅ Admin login
2. ✅ Dashboard affiche stats correctes
3. ✅ Liste conducteurs filtrée par statut
4. ✅ Détail conducteur affiche tous documents
5. ✅ Approve → Driver.verificationStatus = APPROVED
6. ✅ Reject → Driver reçoit notification avec raison
7. ✅ Activity logs enregistrés

---

## 📊 Ordre d'implémentation recommandé

### Phase 1 : Schema + Backend KYC (2-3h)
1. Modifier schema Prisma (DriverKYC, Admin, enums)
2. Migration Prisma : `npx prisma migrate dev --name add-kyc-tables`
3. Créer service S3 (upload)
4. Créer service Face Verification (AWS Rekognition)
5. Créer routes `/api/driver/kyc/*`
6. Tester avec Postman

### Phase 2 : Frontend KYC (2-3h)
1. Créer pages KYC step-by-step
2. Intégrer upload de fichiers
3. Intégrer webcam pour photo faciale
4. Middleware pour bloquer accès
5. Tester workflow complet

### Phase 3 : Backend Admin (1-2h)
1. Créer routes `/api/admin/*`
2. Ajouter middleware requireAdmin
3. Tester avec Postman

### Phase 4 : Frontend Admin (2-3h)
1. Page login admin
2. Dashboard avec stats
3. Liste conducteurs
4. Page révision KYC
5. Activity logs
6. Tester workflow complet

---

## 🎯 Résultat final attendu

### Pour le conducteur
1. **Inscription** → Redirection automatique vers `/driver/kyc`
2. **Upload documents** → Interface claire step-by-step
3. **Vérification faciale** → Webcam + comparaison automatique
4. **Soumission** → "Votre dossier est en cours de révision"
5. **Notification** → Email/SMS quand approuvé ou rejeté
6. **Accès plateforme** → Seulement si KYC APPROVED

### Pour l'admin
1. **Login** → Interface sécurisée
2. **Dashboard** → Vue d'ensemble des demandes
3. **Révision** → Voir tous documents, scores face matching
4. **Actions** → Approve/Reject/Request revision en 1 clic
5. **Traçabilité** → Tous logs enregistrés

---

## ✅ Checklist avant déploiement

- [ ] Migration Prisma appliquée en production
- [ ] Bucket S3 créé et configuré
- [ ] AWS Rekognition activé (région correcte)
- [ ] Variables d'environnement configurées
- [ ] Premier compte admin créé manuellement en BDD
- [ ] Tests E2E passés (KYC complet + back office)
- [ ] Monitoring/logs configurés
- [ ] Documentation utilisateur créée

---

**Temps estimé total : 8-12 heures de développement**

**Prochaine session : Commencer par Phase 1 (Schema + Backend KYC)**
