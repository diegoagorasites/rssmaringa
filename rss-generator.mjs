import axios from 'axios';
import { JSDOM } from 'jsdom';
import { create } from 'xmlbuilder2';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

async function readConfig() {
  try {
    const data = await fs.readFile(path.resolve('./config.json'), 'utf8');
    return JSON.parse(data);
  } catch {
    throw new Error('Configuração não encontrada. Rode o app para configurar.');
  }
}

function limparHTML(html) {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
}

async function puxarNoticias(siteUrl, limite = 5) {
  const baseUrl = siteUrl.replace(/\/+$/, '');
  try {
    const response = await axios.get(baseUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000,
    });

    const htmlLimpo = limparHTML(response.data);
    const dom = new JSDOM(htmlLimpo);
    const document = dom.window.document;
    const noticias = [...document.querySelectorAll('div.list-item')].slice(0, limite);

    const resultado = [];

    for (const item of noticias) {
      const tituloEl = item.querySelector('.text-xl.font-bold');
      const titulo = tituloEl ? tituloEl.textContent.trim() : '';

      const linkEl = item.querySelector('a');
      const link = linkEl ? baseUrl + linkEl.getAttribute('href') : '';

      const resumoEl = item.querySelector('.line-clamp-2');
      const resumo = resumoEl ? resumoEl.textContent.trim() : '';

      const dataEl = item.querySelector('span.p-tag-label');
      let dataPublicacao = new Date().toUTCString();

      if (dataEl) {
        const dataBr = dataEl.textContent.trim();
        const [dia, mes, ano] = dataBr.split('/');
        if (dia && mes && ano) {
          const dt = new Date(`${ano}-${mes}-${dia}T00:00:00Z`);
          dataPublicacao = dt.toUTCString();
        }
      }

      let conteudo = '';
      if (link) {
        try {
          const detalheResp = await axios.get(link, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000,
          });
          const htmlDetalheLimpo = limparHTML(detalheResp.data);
          const domDetalhe = new JSDOM(htmlDetalheLimpo);
          const contentNodes = domDetalhe.window.document.querySelectorAll('div.editor-reset');
          conteudo = Array.from(contentNodes).map(n => n.innerHTML).join('');
        } catch (err) {
          console.error('⚠️ Erro ao puxar conteúdo da notícia:', err.message);
        }
      }

      const imgEl = item.querySelector('img');
      const imagem = imgEl ? imgEl.getAttribute('src') : '';

      resultado.push({
        titulo,
        link,
        resumo,
        data: dataPublicacao,
        imagem,
        conteudo,
      });
    }

    return resultado;
  } catch (err) {
    console.error('❌ Erro ao puxar notícias:', err.message);
    return [];
  }
}

async function gerarRSS(noticias, siteUrl, filePath) {
  const feed = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('rss', {
      version: '2.0',
      'xmlns:atom': 'http://www.w3.org/2005/Atom',
      'xmlns:content': 'http://purl.org/rss/1.0/modules/content/',
    })
    .ele('channel');

  feed
    .ele('title').txt(`Notícias - ${siteUrl}`).up()
    .ele('link').txt(siteUrl).up()
    .ele('description').txt(`Últimas notícias de ${siteUrl}`).up()
    .ele('language').txt('pt-BR').up()
    .ele('pubDate').txt(new Date().toUTCString()).up()
    .ele('atom:link', {
      href: filePath,
      rel: 'self',
      type: 'application/rss+xml',
    }).up();

  for (const item of noticias) {
    const rssItem = feed.ele('item');
    rssItem.ele('title').dat(item.titulo).up();
    rssItem.ele('link').txt(item.link).up();
    rssItem.ele('description').dat(item.resumo).up();
    rssItem.ele('pubDate').txt(item.data).up();
    rssItem.ele('guid').txt(item.link).up();
    if (item.imagem) {
      rssItem.ele('enclosure', {
        url: item.imagem,
        type: 'image/jpeg',
      }).up();
    }
    rssItem.ele('content:encoded').dat(item.conteudo).up();
    rssItem.up();
  }

  const xml = feed.end({ prettyPrint: true });
  const dataDir = path.dirname(filePath);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(filePath, xml, 'utf8');
}

async function pushGit(config) {
  const cwd = process.cwd();

  let repoUrl = config.gitRepo;
  if (config.gitToken && !repoUrl.includes(config.gitToken)) {
    repoUrl = repoUrl.replace('https://', `https://${config.gitToken}@`);
  }

  try {
    await execPromise(`git init`, { cwd, maxBuffer: 1024 * 1024 });
    await execPromise(`git remote remove origin || true`, { cwd, maxBuffer: 1024 * 1024 });
    await execPromise(`git remote add origin ${repoUrl}`, { cwd, maxBuffer: 1024 * 1024 });
    await execPromise(`git config user.name "${config.gitName}"`, { cwd, maxBuffer: 1024 * 1024 });
    await execPromise(`git config user.email "${config.gitEmail}"`, { cwd, maxBuffer: 1024 * 1024 });
    await execPromise(`git add .`, { cwd, maxBuffer: 1024 * 1024 });

    try {
      await execPromise(`git commit -m "Atualização automática do RSS"`, { cwd, maxBuffer: 1024 * 1024 });
    } catch (commitErr) {
      if (!/nothing to commit/.test(commitErr.stderr)) {
        throw commitErr;
      }
    }

    await execPromise(`git branch -M master`, { cwd, maxBuffer: 1024 * 1024 });
    await execPromise(`git push -f origin master`, { cwd, maxBuffer: 1024 * 1024 });

    console.log('✅ Push no GitHub realizado com sucesso!');
  } catch (err) {
    console.error('❌ Erro no push:', err.message || err.stderr || err);
    await fs.writeFile('debug-log.txt', JSON.stringify(err, null, 2));
  }
}

(async () => {
  try {
    const config = await readConfig();

    const noticias = await puxarNoticias(config.siteUrl, 5);
    const rssFilePath = path.resolve('./data/rss.xml');

    await gerarRSS(noticias, config.siteUrl, rssFilePath);
    await pushGit(config);

    console.log('✅ RSS gerado e enviado com sucesso!');
  } catch (err) {
    console.error('❌ Erro geral:', err.message);
    await fs.writeFile('debug-log.txt', err.stack || err.message || JSON.stringify(err));
  }
})();
