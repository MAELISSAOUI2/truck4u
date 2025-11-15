# 🎨 Guide de l'Interface Modernisée - Truck4u

Ce guide présente les **nouvelles fonctionnalités UI** ajoutées lors de la modernisation de novembre 2025.

---

## 🆕 Nouveautés Principales

### 1. **Système de Composants UI Réutilisables**
7 nouveaux composants modernes dans `apps/web/components/ui/`

### 2. **Onboarding Client en 4 Étapes**
Processus d'inscription guidé et intuitif

### 3. **Tour Guidé Post-Inscription**
Introduction interactive aux fonctionnalités

### 4. **Dashboard Modernisé**
Interface engageante avec stats visuelles

### 5. **Page d'Accueil Redesignée**
Hero section animée et sections modernes

---

## 🎯 Tester les Nouvelles Fonctionnalités

### 1. Page d'Accueil Moderne

**URL** : http://localhost:3000

**Nouveautés** :
- ✨ Header sticky avec logo gradient animé
- 🎬 Hero section avec animations d'entrée progressives
- 📊 Stats en temps réel (5,000+ courses, 500+ chauffeurs)
- 📝 Section "Comment ça marche" visuelle
- 🎨 Boutons avec gradients et animations hover
- 📱 Responsive mobile-first

**À tester** :
1. Survolez les boutons → Effet de zoom
2. Scroll la page → Animations d'apparition des sections
3. Cliquez "Commencer" → Redirection vers onboarding

---

### 2. Onboarding Client (4 Étapes) 🌟

**URL** : http://localhost:3000/customer/onboarding

**Flow complet** :

#### Étape 1 : Type de compte
- Choix visuel entre "Particulier" et "Entreprise"
- Cards avec animations et checkmark
- Hover effect avec scale

#### Étape 2 : Identité
- Input avec validation en temps réel
- Icônes success/error dynamiques
- Champs adaptatifs selon le type choisi

#### Étape 3 : Contact
- Téléphone obligatoire avec validation
- Email optionnel
- Hints explicatifs sous chaque champ

#### Étape 4 : Adresse + Récapitulatif
- Input adresse avec validation de longueur
- Panel récapitulatif bleu avec toutes les infos
- Bouton final de création de compte

**À tester** :
```
1. Sélectionner "Particulier"
2. Nom : "Ahmed Ben Ali"
3. Téléphone : "+216 98 123 456"
4. Email : "ahmed@exemple.com" (optionnel)
5. Adresse : "15 Avenue Habib Bourguiba, Tunis"
6. Cliquer "Créer mon compte"
```

**Caractéristiques** :
- ✅ ProgressSteps en haut avec indicateurs animés
- ✅ Validation en temps réel avec feedback visuel
- ✅ Transitions fluides entre étapes
- ✅ Bouton "Retour" et "Continuer" contextuels
- ✅ Désactivation automatique si étape invalide
- ✅ Récapitulatif final avant création

---

### 3. Tour Guidé Post-Inscription 🚀

**URL** : http://localhost:3000/customer/welcome
(Automatiquement affiché après l'inscription)

**4 Étapes du Tour** :

#### Étape 1 : Bienvenue
- Message personnalisé avec emoji
- Présentation des 4 fonctionnalités clés :
  - Commander des transports
  - Comparer les prix
  - Suivre sur la carte
  - Notifications instantanées

#### Étape 2 : Créer une Course
- Preview visuel du formulaire
- Exemple d'adresses (Tunis → La Marsa)

#### Étape 3 : Comparer les Offres
- Simulation de 3 offres de chauffeurs
- Avec ratings et nombre de courses
- Prices différents

#### Étape 4 : Suivre et Évaluer
- Importance du rating
- Icône étoile animée

**À tester** :
1. Suivre les 4 étapes avec "Suivant"
2. Cliquer sur un indicateur circulaire → Navigation directe
3. Cliquer "Passer le tour" → Redirection vers dashboard
4. À la fin, cliquer "Créer ma première course"

**Caractéristiques** :
- ✅ Gradient headers colorés par étape
- ✅ Indicateurs circulaires avec états (pending, current, completed)
- ✅ Animations de transitions entre étapes
- ✅ Previews visuels interactifs
- ✅ Option de skip

---

### 4. Dashboard Client Modernisé 📊

**URL** : http://localhost:3000/customer/dashboard

**Nouveautés** :

#### Header Sticky
- Logo gradient avec backdrop blur
- Message de bienvenue personnalisé
- Bouton déconnexion accessible

#### Welcome Banner
- Gradient bleu/indigo
- Message dynamique selon l'état
- CTA "Nouvelle course" mis en avant

#### Stats Grid (4 Cards)
- **Total courses** : Badge bleu avec icône Package
- **En attente** : Badge amber avec icône Clock
- **Terminées** : Badge vert avec icône CheckCircle
- **Total dépensé** : Badge purple avec icône DollarSign

Chaque card :
- Gradient background subtil
- Icône colorée dans cercle
- Chiffre en grand (3xl)
- Effet hover avec élévation

#### Actions Rapides
- 3 boutons grands et clairs
- "Créer une course" (primary)
- "Voir mes courses" (outline)
- "Mon profil" (outline)

#### Courses Récentes
- Cards modernes avec badges de statut colorés
- Animations d'entrée progressive (stagger)
- Hover effect avec translation X
- Adresses avec icônes de localisation
- Prix en grand (2xl, blue)
- Redirection au clic

#### Empty State
- Si aucune course :
  - Icône truck animée (scale spring)
  - Message encourageant
  - CTA "Créer ma première course"

**À tester** :
1. Observer les animations au chargement
2. Survoler les stats cards → Élévation
3. Survoler une course → Translation X
4. Cliquer sur une course → Redirection

---

## 🧩 Composants UI Disponibles

### 1. Button

**Import** :
```tsx
import { Button } from '@/components/ui';
```

**Variants** :
- `primary` : Gradient bleu/indigo
- `secondary` : Gris clair
- `danger` : Rouge
- `ghost` : Transparent
- `outline` : Bordure

**Tailles** :
- `sm`, `md`, `lg`

**Props** :
- `loading` : Affiche un spinner
- `icon` : Icône à gauche
- `fullWidth` : Largeur 100%

**Exemples** :
```tsx
<Button variant="primary" size="lg">
  Créer une course
</Button>

<Button variant="outline" icon={<Plus />} loading={loading}>
  Ajouter
</Button>
```

---

### 2. Card

**Import** :
```tsx
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui';
```

**Props** :
- `padding` : 'none' | 'sm' | 'md' | 'lg'
- `hover` : Active l'effet hover
- `gradient` : Ajoute un gradient background
- `noBorder` : Supprime la bordure

**Exemples** :
```tsx
<Card hover padding="lg">
  <CardHeader>
    <CardTitle>Titre de la carte</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <p>Contenu de la carte</p>
</Card>

<Card gradient className="bg-gradient-to-r from-blue-600 to-indigo-600">
  {/* Contenu avec background gradient */}
</Card>
```

---

### 3. Input

**Import** :
```tsx
import { Input } from '@/components/ui';
```

**Props** :
- `label` : Label au-dessus
- `icon` : Icône à gauche
- `success` : État de succès (checkmark vert)
- `error` : Message d'erreur (texte rouge)
- `hint` : Message d'aide sous l'input

**Exemples** :
```tsx
<Input
  label="Téléphone"
  icon={<Phone className="w-5 h-5" />}
  value={phone}
  onChange={(e) => setPhone(e.target.value)}
  success={isValid}
  error={phoneError}
  hint="Format : +216 XX XXX XXX"
  required
/>
```

---

### 4. Badge

**Import** :
```tsx
import { Badge } from '@/components/ui';
```

**Variants** :
- `default` : Gris
- `success` : Vert
- `warning` : Amber
- `danger` : Rouge
- `info` : Bleu
- `purple` : Violet

**Tailles** : `sm`, `md`, `lg`

**Exemples** :
```tsx
<Badge variant="success" dot>
  Terminée
</Badge>

<Badge variant="warning" size="sm">
  En attente
</Badge>
```

---

### 5. Modal

**Import** :
```tsx
import { Modal } from '@/components/ui';
```

**Props** :
- `isOpen` : État d'ouverture
- `onClose` : Callback de fermeture
- `title` : Titre du modal
- `description` : Description
- `size` : 'sm' | 'md' | 'lg' | 'xl'
- `showClose` : Afficher le X (défaut true)

**Exemples** :
```tsx
const [open, setOpen] = useState(false);

<Modal
  isOpen={open}
  onClose={() => setOpen(false)}
  title="Confirmer l'action"
  description="Êtes-vous sûr ?"
  size="md"
>
  <div className="space-y-4">
    <p>Contenu du modal</p>
    <div className="flex gap-4">
      <Button onClick={() => setOpen(false)}>Annuler</Button>
      <Button variant="danger">Confirmer</Button>
    </div>
  </div>
</Modal>
```

---

### 6. ProgressSteps

**Import** :
```tsx
import { ProgressSteps } from '@/components/ui';
```

**Props** :
- `steps` : Array d'objets { id, title, description }
- `currentStep` : Étape actuelle
- `onStepClick` : Callback au clic
- `allowSkip` : Permettre de sauter des étapes

**Exemples** :
```tsx
const steps = [
  { id: 1, title: 'Compte', description: 'Type de compte' },
  { id: 2, title: 'Identité', description: 'Vos informations' },
  { id: 3, title: 'Contact', description: 'Téléphone et email' },
  { id: 4, title: 'Adresse', description: 'Localisation' }
];

<ProgressSteps
  steps={steps}
  currentStep={currentStep}
  onStepClick={setCurrentStep}
  allowSkip={false}
/>
```

---

### 7. AnimatedPage

**Import** :
```tsx
import { AnimatedPage } from '@/components/ui';
```

**Usage** :
Wrapper pour animer l'entrée/sortie de page

**Exemples** :
```tsx
<AnimatedPage className="min-h-screen bg-gray-50">
  {/* Contenu de la page */}
</AnimatedPage>
```

---

## 🎨 Animations Framer Motion

### Animations Courantes

#### Fade In + Slide
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Contenu
</motion.div>
```

#### Hover Effect
```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
  Cliquez-moi
</motion.button>
```

#### Stagger Children
```tsx
{items.map((item, i) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: i * 0.05 }}
  >
    {item.content}
  </motion.div>
))}
```

#### Rotation Continue
```tsx
<motion.div
  animate={{ rotate: 360 }}
  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
>
  ⚙️
</motion.div>
```

#### Scale Spring
```tsx
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ type: 'spring' }}
>
  🎉
</motion.div>
```

---

## 📱 Responsive Design

### Breakpoints Tailwind

```css
sm: 640px   /* Small devices */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

### Exemples

```tsx
{/* Mobile first */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* 1 colonne sur mobile, 2 sur tablette, 4 sur desktop */}
</div>

{/* Hidden/visible selon device */}
<div className="hidden md:block">
  Visible uniquement sur tablette et +
</div>

<div className="block md:hidden">
  Visible uniquement sur mobile
</div>
```

---

## 🎯 Bonnes Pratiques

### 1. Utiliser les Composants UI

❌ **Mauvais** :
```tsx
<button className="bg-blue-600 text-white px-6 py-3 rounded-xl">
  Cliquer
</button>
```

✅ **Bon** :
```tsx
<Button variant="primary">
  Cliquer
</Button>
```

### 2. Animations Performantes

❌ **Mauvais** :
```tsx
<motion.div animate={{ width: '100%' }}>
  {/* Éviter d'animer width/height */}
</motion.div>
```

✅ **Bon** :
```tsx
<motion.div animate={{ scale: 1.1, opacity: 1 }}>
  {/* Animer transform et opacity */}
</motion.div>
```

### 3. Validation de Formulaires

❌ **Mauvais** :
```tsx
<input type="text" />
{error && <p style={{color: 'red'}}>{error}</p>}
```

✅ **Bon** :
```tsx
<Input
  value={value}
  onChange={handleChange}
  success={isValid}
  error={errorMessage}
/>
```

---

## 🐛 Debugging

### Animations ne fonctionnent pas

**Vérifier** :
1. `framer-motion` installé ?
2. Import correct ?
```tsx
import { motion } from 'framer-motion';
```

### Composants UI non trouvés

**Vérifier** :
1. Path alias configuré dans `tsconfig.json`
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

2. Import depuis `@/components/ui` et non `./components/ui`

### Styles Tailwind non appliqués

**Vérifier** :
1. `globals.css` importé dans `layout.tsx`
2. Classes correctement écrites (pas d'espaces)

---

## 📚 Ressources

- **Framer Motion** : https://www.framer.com/motion/
- **HeadlessUI** : https://headlessui.com/
- **Tailwind CSS** : https://tailwindcss.com/docs
- **Lucide Icons** : https://lucide.dev/

---

## 🎉 Enjoy!

Vous avez maintenant tous les outils pour créer une interface moderne et engageante !

**Rappel** :
- Utilisez les composants UI pour la cohérence
- Ajoutez des animations pour la fluidité
- Testez sur mobile dès le début
- Validez en temps réel pour le feedback

**Happy Coding! 🚀**
