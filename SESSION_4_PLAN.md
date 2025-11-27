# SESSION 4 - Plan de Continuation

**Date:** 2025-11-27
**Branche:** `claude/kyc-admin-mantine-018mXHM8CxWHpUfvhfS9qeqK`
**Dernière session:** Session 3 (B2B backend complet)

---

## 📋 Travail Accompli (Session 3 continuation)

### Commit `7fdab6c`: Patente + Business Registration/Dashboard

1. **Database Schema** (`schema.prisma`):
   ```prisma
   // Ajouté au modèle Driver:
   hasPatenteOption     Boolean   @default(false)
   patenteUrl           String?
   patenteVerified      Boolean   @default(false)
   patenteVerifiedAt    DateTime?
   patenteRejectionReason String? @db.Text
   ```

2. **Frontend B2B Pages Créées**:
   - `/business/register` - Wizard inscription 3 étapes
   - `/business/dashboard` - Dashboard avec stats + limites

---

## 🎯 À Compléter (Priorité 1)

### 1. Pages B2B Manquantes (2-3h estimé)

#### A. Page Liste Commandes (`/business/orders/page.tsx`)
```tsx
Features:
- Liste paginée des commandes
- Filtres par status
- Badge statut coloré
- Bouton "Nouvelle commande"
- Click → redirect vers /business/orders/[id]
```

#### B. Page Nouvelle Commande (`/business/orders/new/page.tsx`)
```tsx
Features:
- Form destinataire (nom, téléphone, adresse)
- Select type de colis (DOCUMENT, PETIT_COLIS, etc.)
- Checkbox COD + montant
- Select adresse enregistrée (optionnel)
- Bouton "Créer brouillon" + "Soumettre"
```

#### C. Page Tracking Commande (`/business/orders/[id]/page.tsx`)
```tsx
Features:
- Timeline status (DRAFT → DELIVERED)
- Infos commande (destinataire, colis, COD)
- Infos conducteur si assigné (nom, téléphone, note)
- Map avec position conducteur en temps réel
- Bouton "Annuler" si statut permet
- Bouton "Noter" si DELIVERED
```

### 2. Modification KYC Conducteur (1-2h estimé)

#### A. Ajouter Checkbox Patente (`/driver/kyc/page.tsx`)
```tsx
// Étape 1 - Inscription
<Checkbox
  label="Je dispose d'une patente professionnelle"
  checked={hasPatenteOption}
  onChange={(e) => setHasPatenteOption(e.currentTarget.checked)}
/>

// Si coché → afficher upload dans étape documents
{hasPatenteOption && (
  <FileInput
    label="Patente professionnelle"
    placeholder="Upload patente"
    accept="image/*,application/pdf"
    onChange={handlePatenteUpload}
  />
)}
```

#### B. Backend Upload Patente (`/api/drivers/kyc/upload-patente`)
```ts
POST /api/drivers/:id/upload-patente
Body: { patenteUrl: string }
→ Update driver.patenteUrl
```

### 3. Admin Validation Patente (1h estimé)

#### A. Page Admin KYC (`/admin/kyc/page.tsx`)
```tsx
// Ajouter section patente dans détails conducteur
{driver.hasPatenteOption && (
  <Card>
    <Title order={5}>Patente Professionnelle</Title>
    {driver.patenteUrl && (
      <Image src={driver.patenteUrl} />
    )}
    <Group>
      <Button onClick={() => approvePatente(driver.id)}>
        Valider Patente
      </Button>
      <Button color="red" onClick={() => rejectPatente(driver.id)}>
        Refuser
      </Button>
    </Group>
  </Card>
)}
```

#### B. Backend Validation (`/api/admin/drivers/:id/validate-patente`)
```ts
PUT /api/admin/drivers/:id/validate-patente
Body: { approved: boolean, reason?: string }

Si approved:
  - patenteVerified = true
  - patenteVerifiedAt = now()
  - b2bLevel = 2 (auto-upgrade)
  - b2bPreferences.acceptsB2B = true (défaut)

Si rejected:
  - patenteRejectionReason = reason
  - patenteVerified = false
```

### 4. Modal Abonnement Post-KYC (1h estimé)

#### A. Modal Component (`/components/SubscriptionModal.tsx`)
```tsx
<Modal opened={opened} onClose={onClose}>
  <Title>🎉 Compte Validé !</Title>
  <Text>Boostez votre visibilité avec un abonnement:</Text>

  <SimpleGrid cols={3}>
    {/* STANDARD - Gratuit */}
    <Card>
      <Badge>STANDARD</Badge>
      <Text>Gratuit</Text>
      <List>
        <List.Item>Accès normal</List.Item>
      </List>
    </Card>

    {/* PREMIUM - 49 DT */}
    <Card>
      <Badge color="blue">PREMIUM</Badge>
      <Text fw={700}>49 DT/mois</Text>
      <List>
        <List.Item>Priorité 1.5×</List.Item>
        <List.Item>Boost +50%</List.Item>
        <List.Item>Accès anticipé 5min</List.Item>
      </List>
      <Button>Souscrire</Button>
    </Card>

    {/* ELITE - 99 DT */}
    <Card>
      <Badge color="gold">ELITE</Badge>
      <Text fw={700}>99 DT/mois</Text>
      <List>
        <List.Item>Priorité 2.5×</List.Item>
        <List.Item>Boost +100%</List.Item>
        <List.Item>Commission -2%</List.Item>
      </List>
      <Button>Souscrire</Button>
    </Card>
  </SimpleGrid>

  <Text size="sm" c="dimmed">
    Note: Abonnement NON requis pour faire du B2B
  </Text>

  <Button variant="subtle" onClick={onClose}>
    Peut-être plus tard
  </Button>
</Modal>
```

#### B. Afficher Modal Après Validation KYC
```tsx
// Dans /driver/dashboard ou /driver/kyc
useEffect(() => {
  // Si driver.verificationStatus === 'APPROVED'
  // ET modal jamais affiché (localStorage)
  if (driver.verificationStatus === 'APPROVED' && !localStorage.getItem('subscription-modal-shown')) {
    setSubscriptionModalOpened(true);
    localStorage.setItem('subscription-modal-shown', 'true');
  }
}, [driver]);
```

---

## 🔧 Backend Endpoints à Créer

### 1. Upload Patente
```ts
POST /api/drivers/:id/upload-patente
Headers: Authorization Bearer <driver-token>
Body: { patenteUrl: string }
Response: { message: "Patente uploaded", driver }
```

### 2. Validate Patente (Admin)
```ts
PUT /api/admin/drivers/:id/validate-patente
Headers: Authorization Bearer <admin-token>
Body: { approved: boolean, reason?: string }

Logic:
  if (approved) {
    driver.patenteVerified = true
    driver.patenteVerifiedAt = new Date()
    driver.b2bLevel = 2  // Auto-upgrade
    driver.b2bPreferences = { acceptsB2B: true, ... }
  } else {
    driver.patenteRejectionReason = reason
  }
```

### 3. Subscribe Driver
```ts
POST /api/driver-subscriptions/subscribe
Headers: Authorization Bearer <driver-token>
Body: { tier: "PREMIUM" | "ELITE", paymentMethod: "FLOUCI" | "D17" }

Logic:
  - Create DriverSubscription
  - driver.hasActiveSubscription = true
  - driver.subscriptionTier = tier
  - driver.platformFeeRate = tier === 'ELITE' ? 0.08 : 0.10
```

---

## 📝 Migration Database

**CRITIQUE**: Avant de tester, exécuter:
```bash
cd packages/database
npx prisma migrate dev --name add_patente_and_complete_b2b
npx prisma generate
```

Cela va créer:
- Champs patente dans Driver
- Tous les modèles B2B (Business, BusinessOrder, etc.)
- Enums B2B (TrustLevel, BusinessOrderStatus, etc.)

---

## 🧪 Tests à Effectuer

### 1. Test Inscription Business
```bash
1. Aller sur /business/register
2. Remplir form (Épicerie Test, LOCAL_SHOP, Mohamed)
3. Entrer téléphone +21698765432
4. Entrer code 123456
5. Vérifier redirect vers /business/dashboard
6. Vérifier localStorage.businessToken existe
```

### 2. Test Dashboard Business
```bash
1. Aller sur /business/dashboard
2. Vérifier stats affichées (0 commandes au début)
3. Vérifier badge STARTER
4. Vérifier limites quotidiennes (300 DT COD, 5 commandes)
```

### 3. Test KYC Conducteur avec Patente
```bash
1. S'inscrire comme conducteur
2. Cocher "Je dispose d'une patente"
3. Upload documents KYC + patente
4. Admin: valider patente
5. Vérifier b2bLevel = 2 automatiquement
6. Vérifier modal abonnement s'affiche
```

### 4. Test Souscription Abonnement
```bash
1. Dans modal, cliquer "Souscrire PREMIUM"
2. Vérifier API call: POST /api/driver-subscriptions/subscribe
3. Vérifier badge PREMIUM affiché sur profil
4. Vérifier hasActiveSubscription = true
```

---

## 🚨 Problèmes Connus

### 1. Migration DB Non Exécutée
**Solution**: `cd packages/database && npx prisma migrate dev --name add_patente_and_complete_b2b`

### 2. Batch Jobs Erreur ON_HOLD
**Solution**: Après migration, redémarrer serveur API

### 3. Token Business vs Driver
- Business token: `localStorage.businessToken`
- Driver token: Zustand store `truck4u-auth`
- Admin token: `localStorage.adminToken`

---

## 📊 Commits Prévus

1. `feat: Complete B2B frontend pages (orders list, new order, tracking)`
2. `feat: Add patente checkbox and upload to driver KYC`
3. `feat: Add admin patente validation with auto b2bLevel upgrade`
4. `feat: Add subscription modal for post-KYC driver onboarding`
5. `docs: Update PROGRESS.md with Session 4 complete frontend B2B`

---

## 💡 Notes Importantes

- **React 18.2.0**: NE PAS upgrader React
- **Mantine Components**: Utiliser @mantine/core, @mantine/notifications, @mantine/dates
- **Dynamic Imports**: Maps doivent utiliser `dynamic(() => import(...), { ssr: false })`
- **API Base URL**: `process.env.NEXT_PUBLIC_API_URL`

---

**Prochaine session**: Commencer par terminer les 3 pages B2B manquantes, puis KYC/Patente, puis Modal abonnement.
