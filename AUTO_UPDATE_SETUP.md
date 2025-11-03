# 🔄 Auto-Updater - Configuration terminée

## ✅ Ce qui a été configuré

### 1. Configuration de publication GitHub
Le fichier `package.json` a été mis à jour avec :
- Configuration `build.publish` pointant vers votre repository GitHub
- Configuration des plateformes (macOS, Windows, Linux)
- Scripts npm pour publier facilement

### 2. Auto-updater amélioré
Le fichier `public/electron.js` inclut maintenant :
- Vérification automatique au démarrage (après 3 secondes)
- Vérification manuelle via le menu
- Interface utilisateur en français
- Gestion de la progression du téléchargement
- Installation automatique ou manuelle

### 3. Scripts disponibles

#### Publication rapide
```bash
# Publier pour macOS (nécessite GH_TOKEN)
npm run publish:mac

# Publier pour Windows
npm run publish:win

# Publier pour Linux
npm run publish:linux

# Publier pour toutes les plateformes
npm run publish:all

# Créer un build sans publier (draft)
npm run publish:draft
```

#### Build local (sans publication)
```bash
npm run electron-pack        # Plateforme actuelle
npm run electron-pack-mac    # macOS
npm run electron-pack-win    # Windows
npm run electron-pack-linux  # Linux
```

## 🚀 Comment publier une release

### Méthode 1 : Script automatique (recommandé)
```bash
./scripts/publish-release.sh
```
Le script vous guidera à travers le processus.

### Méthode 2 : Manuelle
1. **Configurer le token GitHub**
   ```bash
   export GH_TOKEN="votre_token_github"
   ```

2. **Mettre à jour la version dans package.json**
   ```json
   {
     "version": "0.1.5"
   }
   ```

3. **Publier**
   ```bash
   npm run publish:mac
   ```

4. **Commiter et pousser**
   ```bash
   git add package.json
   git commit -m "Bump version to 0.1.5"
   git tag v0.1.5
   git push && git push --tags
   ```

## 📋 Prochaines étapes

### 1. Générer un token GitHub
1. Allez sur : https://github.com/settings/tokens/new
2. Donnez un nom : "Lexa Guard Release"
3. Cochez : `repo` (Full control of private repositories)
4. Générez et copiez le token
5. Ajoutez-le à votre environnement :
   ```bash
   # Dans ~/.zshrc ou ~/.bashrc
   export GH_TOKEN="ghp_votre_token_ici"
   ```

### 2. Tester la publication
1. Changez la version dans `package.json` à `0.1.5`
2. Lancez `npm run publish:mac`
3. Vérifiez sur https://github.com/fgrimaepitech/lexa-guard/releases

### 3. Tester l'auto-update
1. Installez la version 0.1.4 sur votre machine
2. Publiez la version 0.1.5 sur GitHub
3. Lancez l'application version 0.1.4
4. Après 3 secondes, vous devriez voir une notification de mise à jour

## 🔍 Fonctionnalités de l'auto-updater

### Vérification automatique
- ✅ Vérifie automatiquement au démarrage (après 3 secondes)
- ✅ Désactivé en mode développement
- ✅ Ne perturbe pas l'utilisateur si déjà à jour

### Vérification manuelle
- ✅ Menu : **Lexa Guard > Vérifier les mises à jour...**
- ✅ Affiche un message même si déjà à jour

### Téléchargement
- ✅ Demande confirmation avant de télécharger
- ✅ Affiche la progression du téléchargement
- ✅ Barre de progression dans la dock (macOS) / barre des tâches (Windows)

### Installation
- ✅ Notification quand la mise à jour est prête
- ✅ Choix : "Redémarrer maintenant" ou "Plus tard"
- ✅ Si "Plus tard", s'installe à la prochaine fermeture

## 📝 Notes importantes

### Versionnement
Utilisez le versionnement sémantique :
- `0.1.4` → `0.1.5` : Corrections de bugs
- `0.1.4` → `0.2.0` : Nouvelles fonctionnalités
- `0.1.4` → `1.0.0` : Changements majeurs

### Signature de code
Pour éviter les avertissements de sécurité :
- **macOS** : Certificat Apple Developer
- **Windows** : Certificat de signature de code

### Plateformes
- Vous pouvez build pour Windows/Linux depuis macOS avec `publish:all`
- Pour un build Windows natif, utilisez une machine Windows

## 📚 Documentation complète

Consultez `RELEASE_GUIDE.md` pour plus de détails.

## 🆘 Support

En cas de problème :
1. Vérifiez que `GH_TOKEN` est défini
2. Vérifiez les permissions du token
3. Consultez les logs : `Console.app` (macOS) ou console dans DevTools
4. Vérifiez que la release est bien créée sur GitHub

---

**Votre application est maintenant prête pour les mises à jour automatiques ! 🎉**

