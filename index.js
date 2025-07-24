import axios from 'axios';
import { JSDOM } from 'jsdom';
import { create } from 'xmlbuilder2';
import fs from 'fs/promises';
import path from 'path';

// Função para puxar as notícias
async function puxarNoticiasMaringa(limite = 5) {
  const baseUrl = 'https://www.maringa.pr.gov.br';
  const url = baseUrl + '/noticias/';

  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000,
    });

    const dom = new JSDOM(response.data);
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
        // Data no formato DD/MM/YYYY
        const dataBr = dataEl.textContent.trim();
        const [dia, mes, ano] = dataBr.split('/');
        if (dia && mes && ano) {
          const dt = new Date(`${ano}-${mes}-${dia}T00:00:00Z`);
          dataPublicacao = dt.toUTCString();
        }
      }

      // Pegar o conteúdo completo via outra requisição
      let conteudo = '';
      if (link) {
        try {
          const detalheResp = await axios.get(link, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000,
          });
          const domDetalhe = new JSDOM(detalheResp.data);
          const contentNodes = domDetalhe.window.document.querySelectorAll('div.editor-reset');
          conteudo = Array.from(contentNodes).map(n => n.innerHTML).join('');
        } catch {
          conteudo = '';
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
    console.error('Erro ao puxar notícias:', err.message);
    return [];
  }
}

// Função para gerar o RSS em XML
async function gerarRSS(noticias) {
  const feedUrl = 'https://raw.githubusercontent.com/diegoagorasites/rssmaringa/master/data/rss.xml';

  const feed = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('rss', {
      version: '2.0',
      'xmlns:atom': 'http://www.w3.org/2005/Atom',
      'xmlns:content': 'http://purl.org/rss/1.0/modules/content/',
    })
    .ele('channel');

  feed.ele('title').txt('Notícias - Prefeitura de Maringá').up()
    .ele('link').txt('https://www.maringa.pr.gov.br/noticias/').up()
    .ele('description').txt('Últimas notícias da Prefeitura de Maringá').up()
    .ele('language').txt('pt-BR').up()
    .ele('pubDate').txt(new Date().toUTCString()).up()
    .ele('atom:link', {
      href: feedUrl,
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

  feed.up();

  const xml = feed.end({ prettyPrint: true });

  // Salvar o arquivo rss.xml na pasta data
  const dataDir = path.resolve('./data');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch {}

  const filePath = path.join(dataDir, 'rss.xml');
  await fs.writeFile(filePath, xml, 'utf8');

  console.log('RSS gerado em:', filePath);
}

// Execução principal
async function main() {
  const noticias = await puxarNoticiasMaringa(5);
  await gerarRSS(noticias);
}

main().catch(console.error);
