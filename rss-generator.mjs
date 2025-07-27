import axios from 'axios';
import { JSDOM } from 'jsdom';
import { create } from 'xmlbuilder2';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, 'config.json');
const outputPath = path.join(__dirname, 'rss.xml');
const logPath = path.join(__dirname, 'debug-output.txt');

// Função para executar comandos com buffer maior e registrar saída
function execPromise(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, { ...options, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      const log = `\n== Comando: ${command} ==\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}\n`;
      fs.appendFile(logPath, log).catch(() => {});
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function gerarRSS() {
  try {
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    const { siteUrl, gitUrl } = config;

    const response = await axios.get(siteUrl);
    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    const items = Array.from(document.querySelectorAll('.item-selector')).map(item => ({
      title: item.querySelector('h2')?.textContent.trim() || '',
      link: item.querySelector('a')?.href || '',
      pubDate: new Date().toUTCString(), // ajustar se quiser a data real do item
    }));

    const feed = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('rss', { version: '2.0' })
      .ele('channel')
      .ele('title').txt('Meu Feed RSS').up()
      .ele('link').txt(siteUrl).up()
      .ele('description').txt('Feed RSS gerado automaticamente').up();

    items.forEach(({ title, link, pubDate }) => {
      feed.ele('item')
        .ele('title').txt(title).up()
        .ele('link').txt(link).up()
        .ele('pubDate').txt(pubDate).up()
        .up();
    });

    const xml = feed.end({ prettyPrint: true });

    await fs.writeFile(outputPath, xml);

    // Git push automático
    const cwd = __dirname;

    await execPromise('git add .', { cwd });
    await execPromise('git commit -m "Atualização automática"', { cwd });
    await execPromise('git push -f origin master', { cwd });

    console.log('✅ RSS gerado e enviado com sucesso.');
  } catch (err) {
    console.error('❌ Erro ao gerar RSS:', err.message || err);
    await fs.appendFile(logPath, `\n❌ Erro capturado: ${err.stack || err}\n`);
  }
}

gerarRSS();
