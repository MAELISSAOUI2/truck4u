# Guide de Débogage - Truck4u

## 1. Console du Navigateur (Chrome/Firefox)

### Ouvrir les DevTools:
- Windows/Linux: `F12` ou `Ctrl + Shift + I`
- Mac: `Cmd + Option + I`

### Onglets importants:
1. **Console** - Voir les logs et erreurs JavaScript
2. **Network** - Voir toutes les requêtes API
3. **Application** - Voir localStorage (token d'authentification)

### Vérifier les requêtes API:
1. Ouvrir l'onglet **Network**
2. Filtrer par "XHR" ou "Fetch"
3. Rafraîchir la page du dashboard
4. Chercher la requête `/api/rides/history`
5. Cliquer dessus pour voir:
   - Request Headers (vérifier le token Authorization)
   - Response (voir les données retournées)

## 2. Logs du Backend (API)

### Démarrer l'API en mode développement avec logs:
```bash
cd /home/user/truck4u/apps/api
npm run dev
```

### Les logs s'afficheront dans le terminal:
- Requêtes HTTP entrantes
- Erreurs de validation
- Erreurs de base de données

## 3. Vérifier Directement la Base de Données

### Avec Prisma Studio:
```bash
cd /home/user/truck4u/apps/api
npx prisma studio
```
Cela ouvre une interface web sur http://localhost:5555

### Avec psql (PostgreSQL):
```bash
# Se connecter à la base de données
psql -U postgres -d truck4u

# Voir toutes les courses
SELECT id, status, "customerId", "createdAt" FROM rides ORDER BY "createdAt" DESC LIMIT 10;

# Voir les détails d'une course
SELECT * FROM rides WHERE id = 'YOUR_RIDE_ID';

# Quitter
\q
```

## 4. Commandes de Débogage Rapide

### Vérifier si l'API fonctionne:
```bash
curl http://localhost:4000/api/health
```

### Tester l'authentification:
```bash
# Remplacer YOUR_TOKEN par votre token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/rides/history
```

### Voir les logs en temps réel:
```bash
# Backend logs
cd /home/user/truck4u/apps/api
npm run dev | tee api.log

# Frontend logs (dans la console du navigateur)
# Ajouter temporairement dans dashboard/page.tsx:
console.log('Rides loaded:', rides);
console.log('Token:', token);
```

## 5. Points de Vérification Communs

### Token d'authentification:
1. Ouvrir DevTools > Application > Local Storage
2. Chercher `truck4u-auth`
3. Vérifier que `state.token` existe

### Status de la course:
Les statuses valides sont:
- PENDING_BIDS
- BID_ACCEPTED
- DRIVER_ARRIVING
- PICKUP_ARRIVED
- LOADING
- IN_TRANSIT
- DROPOFF_ARRIVED
- COMPLETED
- CANCELLED

### Filtres du Dashboard:
Vérifier dans `/customer/dashboard/page.tsx`:
```typescript
pending: rides.filter(r => ['PENDING_BIDS', 'BID_ACCEPTED'].includes(r.status)).length
```

## 6. Erreurs Courantes

### "0 courses en attente" mais course créée:
- Vérifier le status de la course (doit être PENDING_BIDS)
- Vérifier que customerId correspond à votre userId
- Vérifier la requête API retourne bien les données

### Requête API échoue:
- Vérifier que l'API tourne (http://localhost:4000)
- Vérifier le token d'authentification
- Vérifier les CORS si erreur de ce type

### Course visible dans DB mais pas dans l'UI:
- Vérifier le filtre de status
- Vérifier la transformation des données
- Vérifier les logs de la console
