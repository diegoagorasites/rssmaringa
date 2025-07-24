#!/bin/bash

# Carrega variáveis do .env
export $(grep -v '^#' .env | xargs)

# Verifica se as variáveis estão setadas
if [[ -z "$GIT_USER" || -z "$GIT_TOKEN" || -z "$GIT_REPO" ]]; then
  echo "Erro: Variáveis GIT_USER, GIT_TOKEN ou GIT_REPO não estão definidas no .env"
  exit 1
fi

# Inicializa repositório (se ainda não inicializado)
if [ ! -d .git ]; then
  git init
  echo "Repositório Git inicializado."
fi

# Adiciona remote (remove se existir)
git remote remove origin 2> /dev/null

git remote add origin https://${GIT_USER}:${GIT_TOKEN}@github.com/${GIT_USER}/${GIT_REPO}

echo "Remote configurado: origin"

# Adiciona todos os arquivos
git add .

# Faz commit com mensagem padrão
git commit -m "Commit automático via script" || echo "Nada para commitar."

# Tenta push para master, se falhar tenta main
git push -u origin master || git push -u origin main

echo "Push realizado."