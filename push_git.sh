#!/bin/bash

echo "🚀 Iniciando push automático..."

# Carrega variáveis do .env
export $(grep -v '^#' .env | xargs)

# Configura nome e email do usuário
git config --global user.name "$GIT_USER"
git config --global user.email "$GIT_EMAIL"

# Remove credential helper que não existe
git config --global --unset credential.helper

# Adiciona o arquivo específico
git add data/rss.xml

# Verifica se há algo a commitar
if git diff --cached --quiet; then
  echo "✅ Nada para commitar"
else
  echo "📦 Commitando arquivo..."
  git commit -m "Atualização automática do RSS em $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Push com autenticação direta
echo "📤 Enviando para o repositório..."
git push https://${GIT_USERNAME}:${GITHUB_TOKEN}@${REPO_URL} master

echo "✔️ Push finalizado com sucesso."
