echo off
cd /d "C:\Users\neoof\Downloads\TeamViewer_ReceivedFiles\RSSMaringa"

:: Executa o script Node e salva erros
node index.js >nul 2> error.log

:: Adiciona mudanças ao Git
git add data/rss.xml

:: Cria commit com data e hora
git commit -m "Atualização automática - %date% %time%" >nul 2>&1

:: Faz push para o repositório
git push origin master >nul 2> error_push.log
