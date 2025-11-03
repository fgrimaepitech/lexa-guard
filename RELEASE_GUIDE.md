# Guide de publication des releases

## Configuration terminée ✅

L'auto-updater est maintenant configuré pour votre application Lexa Guard. Voici comment publier une nouvelle release.

## Prérequis

1. **Token GitHub** : Vous devez générer un token GitHub avec les permissions nécessaires
   - Allez sur : https://github.com/settings/tokens/new
   - Sélectionnez les scopes : `repo` (accès complet aux repositories)
   - Générez le token et copiez-le

2. **Variable d'environnement** : Ajoutez le token à vos variables d'environnement
   ```bash
   # macOS/Linux
   export GH_TOKEN="votre_token_github"
   
   # Windows (PowerShell)
   $env:GH_TOKEN="votre_token_github"
   
   # Windows (CMD)
   set GH_TOKEN=votre_token_github
   ```

## Processus de publication

### 1. Mettre à jour la version

Éditez le fichier `package.json` et incrémentez le numéro de version :

```json
{
  "version": "0.1.5"  // Exemple: passer de 0.1.4 à 0.1.5
}
```

### 2. Créer le build et publier

**Option A : Publier pour toutes les plateformes (si vous êtes sur macOS)**
```bash
npm run electron-pack-all -- --publish always
```

**Option B : Publier pour une seule plateforme**
```bash
# Pour macOS
npm run electron-pack-mac -- --publish always

# Pour Windows
npm run electron-pack-win -- --publish always

# Pour Linux
npm run electron-pack-linux -- --publish always
```

**Option C : Créer le build en mode draft (brouillon)**
```bash
npm run electron-pack-mac -- --publish never
# Puis uploadez manuellement les fichiers sur GitHub Releases
```

### 3. Vérifier la publication

1. Allez sur votre repository GitHub : https://github.com/fgrimaepitech/lexa-guard/releases
2. Vous devriez voir votre nouvelle release avec les fichiers binaires (.dmg, .exe, .AppImage, etc.)
3. Les fichiers importants pour l'auto-update :
   - `latest-mac.yml` (pour macOS)
   - `latest.yml` (pour Windows/Linux)
   - Les fichiers binaires d'installation

## Fonctionnement de l'auto-updater

### Vérification automatique
- L'application vérifie automatiquement les mises à jour **3 secondes après le démarrage**
- Si une mise à jour est disponible, l'utilisateur reçoit une notification

### Vérification manuelle
- L'utilisateur peut vérifier manuellement via le menu : **Lexa Guard > Vérifier les mises à jour...**

### Processus de mise à jour
1. L'utilisateur est notifié qu'une nouvelle version est disponible
2. Il peut choisir de **Télécharger** maintenant ou **Plus tard**
3. Pendant le téléchargement, une barre de progression s'affiche
4. Une fois téléchargé, l'utilisateur peut choisir :
   - **Redémarrer maintenant** : l'app se ferme et s'installe automatiquement
   - **Plus tard** : la mise à jour s'installera à la prochaine fermeture de l'app

## Scripts npm disponibles

```bash
# Développement
npm run electron-dev              # Lance l'app en mode développement

# Build local (sans publier)
npm run electron-pack             # Build pour la plateforme actuelle
npm run electron-pack-mac         # Build pour macOS
npm run electron-pack-win         # Build pour Windows
npm run electron-pack-linux       # Build pour Linux
npm run electron-pack-all         # Build pour toutes les plateformes

# Build et publication sur GitHub
npm run electron-pack-mac -- --publish always     # Build et publie pour macOS
npm run electron-pack-win -- --publish always     # Build et publie pour Windows
npm run electron-pack-linux -- --publish always   # Build et publie pour Linux
npm run electron-pack-all -- --publish always     # Build et publie pour tout
```

## Conseils

1. **Versionnement sémantique** : Utilisez le format `MAJOR.MINOR.PATCH`
   - `MAJOR` : changements incompatibles avec les versions précédentes
   - `MINOR` : nouvelles fonctionnalités rétro-compatibles
   - `PATCH` : corrections de bugs

2. **Tests avant publication** : Testez toujours votre build localement avant de publier
   ```bash
   npm run electron-pack-mac
   # Testez l'application dans dist/
   ```

3. **Notes de release** : Ajoutez toujours des notes de version sur GitHub pour informer les utilisateurs des changements

4. **Mode développement** : L'auto-updater est désactivé en mode développement pour éviter les conflits

## Dépannage

### L'auto-updater ne fonctionne pas
- Vérifiez que vous êtes en mode production (pas en dev)
- Vérifiez que les fichiers `latest-mac.yml` ou `latest.yml` sont présents dans la release GitHub
- Vérifiez les logs dans la console : `Checking for updates...`

### Erreur de publication
- Vérifiez que votre token GitHub (`GH_TOKEN`) est valide
- Vérifiez que vous avez les permissions sur le repository
- Vérifiez que le repository dans `package.json` correspond bien au vôtre

### Certificat de signature (macOS/Windows)
- Pour macOS : vous aurez besoin d'un certificat Apple Developer pour signer l'app
- Pour Windows : vous aurez besoin d'un certificat de signature de code
- Sans certificat, les utilisateurs verront des avertissements de sécurité

## Configuration actuelle

Votre application est configurée pour :
- **Repository** : https://github.com/fgrimaepitech/lexa-guard.git
- **Owner** : fgrimaepitech
- **Repo** : lexa-guard
- **Version actuelle** : 0.1.4

## Prochaines étapes

1. Générez votre token GitHub (si ce n'est pas déjà fait)
2. Ajoutez-le à vos variables d'environnement
3. Incrémentez la version dans `package.json`
4. Lancez un build avec publication : `npm run electron-pack-mac -- --publish always`
5. Vérifiez que la release apparaît sur GitHub
6. Testez l'auto-updater en lançant l'ancienne version de l'app

