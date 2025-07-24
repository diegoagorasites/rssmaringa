#!/bin/bash

# Pega a mensagem base do commit (argumento opcional)
BASE_MSG=$1

# Pega a data e hora atual formatada (ex: 2025-07-24 16:50:30)
NOW=$(date "+%Y-%m-%d %H:%M:%S")

# Monta a mensagem final do commit
if [ -z "$BASE_MSG" ]; then
  COMMIT_MSG="Commit automático em $NOW"
else
  COMMIT_MSG="$BASE_MSG - $NOW"
fi

# Pega o branch atual
BRANCH=$(git branch --show-current)
echo "Branch atual: $BRANCH"

# Mostra status
git status

# Mostra commits locais que ainda não foram enviados
echo "Commits locais que ainda não foram enviados:"
git log origin/$BRANCH..HEAD --oneline

# Adiciona e comita tudo
git add .
git commit -m "$COMMIT_MSG"

# Faz push para o remote no branch atual
git push origin $BRANCH
