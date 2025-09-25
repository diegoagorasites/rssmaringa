#!/bin/bash

echo "🚀 Iniciando push automático..."

# Carrega variáveis do .env
export $(grep -v '^#' .env | xargs)

# Configura nome e email do usuário
git config --global user.name "$GIT_USER"
git config --global user.email "$GIT_EMAIL"

# Remove credential helper que não existe
git config --global --unset credential.helper

# Adiciona os dois RSS
git add data/rss.xml
git add data_londrina/rss.xml

# Commit se houver alterações
if git diff --cached --quiet; then
  echo "✅ Nada para commitar"
else
  echo "📦 Commitando arquivos de RSS..."
  git commit -m "Atualização automática do RSS Maringá + Londrina em $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Puxa alterações do remoto para evitar rejeição de push
echo "🔄 Puxando alterações do remoto..."
git pull --rebase origin master

# Push
echo "📤 Enviando para o repositório..."
git push https://${GIT_USERNAME}:${GITHUB_TOKEN}@${REPO_URL} master

echo "✔️ Push finalizado com sucesso."
