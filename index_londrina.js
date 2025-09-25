import axios from 'axios';
import { JSDOM } from 'jsdom';
import { create } from 'xmlbuilder2';
import fs from 'fs/promises';
import path from 'path';

async function puxarDestaquesLondrina(limite = 5) {
  const url = 'https://blog.londrina.pr.gov.br/';
  try {
    const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    const destaques = [...document.querySelectorAll('div.grid-item.lazy-bg')].slice(0, limite);
    const resultado = [];

    for (const item of destaques) {
      // Título e link
      const tituloEl = item.querySelector('h2.thumb-title a');
      const titulo = tituloEl ? tituloEl.textContent.trim() : '';
      const link = tituloEl ? tituloEl.href : '';

      // Resumo
      const resumoEl = item.querySelector('div.thumb-desc');
      const resumo = resumoEl ? resumoEl.textContent.trim() : titulo;

      // Data
      const dataEl = item.querySelector('div.thumb-meta span.date.meta-item span:last-child');
      let dataPublicacao = new Date().toUTCString();
      if (dataEl) {
        const meses = {
          janeiro: '01', fevereiro: '02', março: '03', abril: '04',
          maio: '05', junho: '06', julho: '07', agosto: '08',
          setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
        };
        const match = dataEl.textContent.trim().match(/(\d{1,2}) de (\w+) de (\d{4})/i);
        if (match) {
          const dia = match[1].padStart(2,'0');
          const mes = meses[match[2].toLowerCase()];
          const ano = match[3];
          if (mes) dataPublicacao = new Date(`${ano}-${mes}-${dia}T00:00:00Z`).toUTCString();
        }
      }

      // Imagem do destaque
      const imgEl = item.querySelector('div.slide-bg');
      let imagem = '';
      if (imgEl) {
        const bg = imgEl.style.backgroundImage; // url("...")
        imagem = bg.slice(5, -2); // remove url("...")
      }

      // Conteúdo completo
      let conteudo = '';
      if (link) {
        try {
          const detalheResp = await axios.get(link, { headers:{ 'User-Agent':'Mozilla/5.0' }, timeout:15000 });
          const domDetalhe = new JSDOM(detalheResp.data);
          const contentNodes = domDetalhe.window.document.querySelectorAll('div.entry-content');
          conteudo = Array.from(contentNodes).map(n => n.innerHTML).join('');
        } catch {}
      }

      resultado.push({ titulo, link, resumo, data: dataPublicacao, imagem, conteudo });
    }

    return resultado;

  } catch (err) {
    console.error('Erro ao puxar destaques:', err);
    return [];
  }
}

async function gerarRSS(destaques) {
  const feedUrl = 'https://raw.githubusercontent.com/diegoagorasites/rsslondrina/master/data_londrina/rss.xml';

  const feed = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('rss', {
      version: '2.0',
      'xmlns:atom': 'http://www.w3.org/2005/Atom',
      'xmlns:content': 'http://purl.org/rss/1.0/modules/content/',
    })
    .ele('channel');

  feed.ele('title').txt('Destaques - Prefeitura de Londrina').up()
      .ele('link').txt('https://blog.londrina.pr.gov.br/').up()
      .ele('description').txt('Últimos destaques da Prefeitura de Londrina').up()
      .ele('language').txt('pt-BR').up()
      .ele('pubDate').txt(new Date().toUTCString()).up()
      .ele('atom:link', { href: feedUrl, rel: 'self', type: 'application/rss+xml' }).up();

  for (const item of destaques) {
    const rssItem = feed.ele('item');
    rssItem.ele('title').dat(item.titulo).up();
    rssItem.ele('link').txt(item.link).up();
    rssItem.ele('description').dat(item.resumo).up();
    rssItem.ele('pubDate').txt(item.data).up();
    rssItem.ele('guid').txt(item.link).up();
    if (item.imagem) rssItem.ele('enclosure', { url: item.imagem, type: 'image/jpeg' }).up();
    rssItem.ele('content:encoded').dat(item.conteudo).up();
    rssItem.up();
  }

  feed.up();

  const xml = feed.end({ prettyPrint: true });
  const dataDir = path.resolve('./data_londrina');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, 'rss.xml'), xml, 'utf8');
}

// Execução
(async () => {
  const destaques = await puxarDestaquesLondrina(5);
  await gerarRSS(destaques);
  console.log('✅ RSS de Londrina gerado em data_londrina/rss.xml');
})();
