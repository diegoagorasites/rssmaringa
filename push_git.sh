#!/bin/bash

# Carrega variáveis do .env
export $(grep -v '^#' .env | xargs)

# Monta URL com usuário e token embutidos
REPO_AUTH_URL="https://${GIT_USER}:${GIT_PASS}@github.com/${GIT_USER}/seuRepo.git"

# Ajusta o remote origin para usar essa URL com autenticação
git remote set-url origin "$REPO_AUTH_URL"

# Detecta branch atual
BRANCH=$(git branch --show-current)

# Adiciona e comita tudo (você pode ajustar mensagem aqui)
git add .
git commit -m "Commit automático via script"

# Faz o push usando URL com autenticação embutida
git push origin $BRANCH