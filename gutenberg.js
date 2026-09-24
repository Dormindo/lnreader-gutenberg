const { fetchApi } = require('@libs/fetch');
const { defaultCover } = require('@libs/defaultCover');
const { NovelStatus } = require('@libs/novelStatus');
const { load: loadCheerio } = require('cheerio');

const API = 'https://gutendex.com/books';

function getHtmlFormat(formats) {
  if (!formats) return null;
  const keys = Object.keys(formats);
  const preferred = [
    'text/html; charset=utf-8',
    'text/html',
    'text/html; charset=iso-8859-1',
  ];
  for (const key of preferred) {
    if (formats[key]) return formats[key];
  }
  const key = keys.find(k => k.toLowerCase().startsWith('text/html'));
  return key ? formats[key] : null;
}

function cleanText(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function bookItem(book) {
  const author = book.authors?.map(a => a.name).join(', ') || 'Unknown';
  const cover = book.formats?.['image/jpeg'] || defaultCover;
  return {
    name: book.title || `Gutenberg #${book.id}`,
    path: String(book.id),
    cover,
  };
}

function encodePath(id, index) {
  return `${id}|${index}`;
}

function decodePath(path) {
  const [id, index] = String(path).split('|');
  return { id: Number(id), index: Number(index || 0) };
}

function findSections(html) {
  const $ = loadCheerio(html);
  $('script, style, noscript').remove();

  const body = $('body').length ? $('body') : $.root();
  const headings = body.find('h1,h2,h3,h4').toArray();

  const candidates = [];
  for (const el of headings) {
    const title = cleanText($(el).text());
    if (!title || title.length > 180) continue;

    const normalized = title.toLowerCase();
    const looksLikeChapter =
      /^(chapter|chap\.|part|book|section|prologue|epilogue|appendix|letter|volume|act|scene)\b/i.test(title) ||
      /^[ivxlcdm]{1,12}[.)\-:]\s+\S/i.test(title) ||
      /^chapter\s+[ivxlcdm0-9]+/i.test(title);

    if (looksLikeChapter) {
      candidates.push({ el, title });
    }
  }

  if (!candidates.length) return [];

  return candidates.map((item, i) => {
    let htmlPart = '';
    let current = item.el;
    const wantedLevel = Number(String(current.name || '').substring(1)) || 2;

    while (current) {
      const tag = String(current.name || '').toLowerCase();
      if (current !== item.el && /^h[1-4]$/.test(tag)) {
        const level = Number(tag.substring(1));
        if (level <= wantedLevel) break;
      }

      if (current.type === 'tag') {
        htmlPart += $.html(current);
      }
      current = current.nextSibling;
    }

    return {
      title: item.title,
      html: htmlPart,
    };
  });
}

class GutenbergPlugin {
  id = 'project-gutenberg';
  name = 'Project Gutenberg';
  icon = 'src/en/gutenberg/icon.png';
  site = 'https://www.gutenberg.org/';
  version = '1.0.0';

  async getBooks(url) {
    const res = await fetchApi(url);
    if (!res.ok) throw new Error(`Gutendex HTTP ${res.status}`);
    return await res.json();
  }

  async popularNovels(pageNo) {
    const page = Math.max(1, pageNo || 1);
    const data = await this.getBooks(
      `${API}?languages=pt&sort=popular&page=${page}`,
    );
    return (data.results || []).map(bookItem);
  }

  async searchNovels(searchTerm, pageNo) {
    if (!searchTerm?.trim()) return [];
    const page = Math.max(1, pageNo || 1);
    const q = encodeURIComponent(searchTerm.trim());
    const data = await this.getBooks(`${API}?search=${q}&languages=pt&page=${page}`);
    return (data.results || []).map(bookItem);
  }

  async parseNovel(novelPath) {
    const id = Number(String(novelPath).split('|')[0]);
    const data = await this.getBooks(`${API}/${id}`);
    const author = data.authors?.map(a => a.name).join(', ') || 'Unknown';
    const htmlUrl = getHtmlFormat(data.formats);

    if (!htmlUrl) {
      throw new Error('This Gutenberg book has no HTML edition.');
    }

    const html = await fetchApi(htmlUrl).then(r => r.text());
    const sections = findSections(html);

    const chapters = sections.length
      ? sections.map((s, i) => ({
          name: s.title,
          path: encodePath(id, i),
          releaseTime: '',
          chapterNumber: i + 1,
        }))
      : [{
          name: 'Full book',
          path: encodePath(id, 0),
          releaseTime: '',
          chapterNumber: 1,
        }];

    return {
      path: String(id),
      name: data.title || `Gutenberg #${id}`,
      author,
      artist: '',
      cover: data.formats?.['image/jpeg'] || defaultCover,
      genres: (data.subjects || []).join(', '),
      status: NovelStatus.Completed,
      summary: [
        author ? `Author: ${author}` : '',
        data.bookshelves?.length ? `Shelves: ${data.bookshelves.join(', ')}` : '',
        `Downloads: ${data.download_count || 0}`,
      ].filter(Boolean).join('\n'),
      chapters,
    };
  }

  async parseChapter(chapterPath) {
    const { id, index } = decodePath(chapterPath);
    const data = await this.getBooks(`${API}/${id}`);
    const htmlUrl = getHtmlFormat(data.formats);

    if (!htmlUrl) {
      throw new Error('This Gutenberg book has no HTML edition.');
    }

    const html = await fetchApi(htmlUrl).then(r => r.text());
    const sections = findSections(html);

    if (!sections.length) {
      const $ = loadCheerio(html);
      $('script, style, noscript').remove();
      const body = $('body').html() || $.root().html() || html;
      return body;
    }

    const section = sections[index];
    if (!section) return '<p>Chapter not found.</p>';
    return section.html;
  }

  resolveUrl = (path, isNovel) =>
    isNovel
      ? `https://www.gutenberg.org/ebooks/${String(path).split('|')[0]}`
      : `https://www.gutenberg.org/ebooks/${String(path).split('|')[0]}`;

}

exports.default = new GutenbergPlugin();
