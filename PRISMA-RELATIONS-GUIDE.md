# Guide des Relations Prisma - Truck4u

**Date:** 2025-12-06
**Auteur:** Claude AI

## ⚠️ Convention Critique: Noms des Relations

### Règle Fondamentale

**Les noms de relations dans Prisma doivent EXACTEMENT correspondre aux noms des champs définis dans le schéma.**

### Le Problème Identifié

Une erreur précédente a capitalisé les noms de relations dans le code (`Ride`, `Driver`, `Customer`), alors que le schéma Prisma les définit en minuscules (`ride`, `driver`, `customer`).

### Exemple du Schéma

```prisma
model Payment {
  id       String @id @default(uuid())
  rideId   String @unique

  // Le champ de relation s'appelle "ride" (minuscule)
  ride     Ride   @relation(fields: [rideId], references: [id])
}

model Ride {
  id         String    @id @default(uuid())
  customerId String
  driverId   String?

  // Les champs de relation s'appellent "customer" et "driver" (minuscules)
  customer   Customer  @relation(fields: [customerId], references: [id])
  driver     Driver?   @relation("CompletedRides", fields: [driverId], references: [id])
  payment    Payment?
}

model Bid {
  id       String @id @default(uuid())
  rideId   String
  driverId String

  // Les champs de relation s'appellent "ride" et "driver" (minuscules)
  ride     Ride   @relation(fields: [rideId], references: [id])
  driver   Driver @relation(fields: [driverId], references: [id])
}
```

### Utilisation Correcte dans le Code

#### ✅ CORRECT

```typescript
const payment = await prisma.payment.findUnique({
  where: { id: paymentId },
  include: {
    ride: {           // ✅ Minuscule - correspond au schéma
      include: {
        driver: true,   // ✅ Minuscule
        customer: true  // ✅ Minuscule
      }
    }
  }
});

// Accès aux données
const ride = payment.ride;                // ✅ Minuscule
const driverName = ride.driver?.name;     // ✅ Minuscule
const customerName = ride.customer?.name; // ✅ Minuscule
```

#### ❌ INCORRECT (Erreur Précédente)

```typescript
const payment = await prisma.payment.findUnique({
  where: { id: paymentId },
  include: {
    Ride: {           // ❌ Capitalisé - NE CORRESPOND PAS au schéma
      include: {
        Driver: true,   // ❌ Capitalisé
        Customer: true  // ❌ Capitalisé
      }
    }
  }
});

// Accès aux données
const ride = payment.Ride;                // ❌ Erreur Prisma
const driverName = ride.Driver?.name;     // ❌ Erreur Prisma
```

### Erreurs Rencontrées

```
❌ Invalid `prisma.payment.findMany()` invocation:
Unknown field 'Ride' for include statement on model 'Payment'.
Available options are marked with ?: { ride?: ... }

❌ Unknown field 'Driver' for include statement on model 'Ride'.
Available options are marked with ?: { driver?: ... }
```

## Corrections Appliquées

### Fichiers Corrigés

1. **`apps/api/src/services/paymentAutoConfirmation.ts`**
   - `include: { Ride: { ... } }` → `include: { ride: { ... } }`
   - `payment.Ride` → `payment.ride`
   - `ride.Driver` → `ride.driver`
   - `ride.Customer` → `ride.customer`

2. **`apps/api/src/services/subscriptionExpiration.ts`**
   - `include: { Driver: true }` → `include: { driver: true }`

3. **Tous les fichiers de routes** (`apps/api/src/routes/*.ts`)
   - ✅ Déjà corrects (utilisent les minuscules)

## Checklist pour Éviter les Régressions

### Avant d'écrire du code Prisma:

1. ✅ Vérifier le nom du champ dans `schema.prisma`
2. ✅ Utiliser EXACTEMENT le même nom (casse comprise)
3. ✅ Tester avec TypeScript - l'auto-complétion aide!

### Convention de Nommage dans Truck4u

**Tous les champs de relations utilisent camelCase minuscule:**

```prisma
✅ ride       (pas Ride)
✅ driver     (pas Driver)
✅ customer   (pas Customer)
✅ payment    (pas Payment)
✅ bid        (pas Bid)
✅ winningBid (pas WinningBid)
✅ cancellation (pas Cancellation)
```

## Synchronisation DB

Après ces corrections, il est **CRUCIAL** de synchroniser la base de données avec le schéma:

```powershell
# Windows PowerShell
.\sync-db.ps1

# Ou version bash
./sync-db.sh
```

⚠️ **ATTENTION:** Cela réinitialisera toutes les données de la DB. Recréer les données de test après.

## Références

- **Schéma Prisma:** `packages/database/prisma/schema.prisma`
- **Documentation Prisma:** https://www.prisma.io/docs/concepts/components/prisma-schema/relations
- **Convention de nommage:** camelCase pour les champs de relation

## Résumé

**Règle d'Or:** Le nom du champ dans le schéma = le nom utilisé dans `include` et dans le code TypeScript.

Si le schéma dit `ride Ride @relation(...)`, alors utilisez `{ ride: true }` dans vos includes.
