#!/bin/bash

# Script de publication de release pour Lexa Guard
# Usage: ./scripts/publish-release.sh [version] [platform]
# Exemple: ./scripts/publish-release.sh 0.1.5 mac

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier que GH_TOKEN est défini
if [ -z "$GH_TOKEN" ]; then
    error "GH_TOKEN n'est pas défini. Veuillez définir votre token GitHub :"
    echo "  export GH_TOKEN='votre_token_github'"
    exit 1
fi

# Récupérer les arguments
NEW_VERSION=$1
PLATFORM=$2

# Si aucune version n'est spécifiée, demander à l'utilisateur
if [ -z "$NEW_VERSION" ]; then
    CURRENT_VERSION=$(node -p "require('./package.json').version")
    echo "Version actuelle : $CURRENT_VERSION"
    read -p "Nouvelle version : " NEW_VERSION
fi

# Si aucune plateforme n'est spécifiée, demander à l'utilisateur
if [ -z "$PLATFORM" ]; then
    echo "Plateformes disponibles :"
    echo "  1) mac"
    echo "  2) win"
    echo "  3) linux"
    echo "  4) all"
    read -p "Choisissez une plateforme (1-4) : " PLATFORM_CHOICE
    
    case $PLATFORM_CHOICE in
        1) PLATFORM="mac";;
        2) PLATFORM="win";;
        3) PLATFORM="linux";;
        4) PLATFORM="all";;
        *) error "Choix invalide"; exit 1;;
    esac
fi

info "Préparation de la release v$NEW_VERSION pour $PLATFORM"

# Mettre à jour la version dans package.json
info "Mise à jour de package.json avec la version $NEW_VERSION..."
npm version $NEW_VERSION --no-git-tag-version

# Confirmer avant de continuer
read -p "Voulez-vous continuer avec la publication ? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    error "Publication annulée"
    exit 1
fi

# Build et publication selon la plateforme
info "Build et publication en cours..."

case $PLATFORM in
    "mac")
        npm run electron-pack-mac -- --publish always
        ;;
    "win")
        npm run electron-pack-win -- --publish always
        ;;
    "linux")
        npm run electron-pack-linux -- --publish always
        ;;
    "all")
        npm run electron-pack-all -- --publish always
        ;;
    *)
        error "Plateforme invalide : $PLATFORM"
        exit 1
        ;;
esac

info "✅ Publication terminée !"
info "Vérifiez votre release sur : https://github.com/fgrimaepitech/lexa-guard/releases"
info ""
warn "N'oubliez pas de :"
warn "  1. Commiter les changements de version (package.json)"
warn "  2. Créer un tag git : git tag v$NEW_VERSION"
warn "  3. Pousser les changements : git push && git push --tags"

