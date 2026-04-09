const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
  const { url } = req.query;

  // MODE DEEP SCRAPER (AMBIL ISI ARTIKEL)
  if (url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': 'https://www.google.com/'
        },
        timeout: 8000
      });

      const $ = cheerio.load(response.data);
      
      // List selector populer untuk website berita Indonesia
      // Detik, Kompas, Liputan6, dll sering pakai class ini untuk konten utama
      let contentSelector = [
        'article', '.detail__body-text', '.read__content', 
        '.entry-content', '.post-content', '.content-article',
        '.detail_text', '#detikdetailtext'
      ].join(', ');

      let paragraphs = [];
      
      // Jika selector khusus ditemukan, ambil dari sana, jika tidak ambil semua <p>
      let searchArea = $(contentSelector).length > 0 ? $(contentSelector) : $('body');
      
      searchArea.find('p').each((i, el) => {
        const txt = $(el).text().trim();
        // Hanya ambil paragraf yang benar-benar berisi teks panjang (bukan caption foto)
        if (txt.length > 60 && !txt.includes('Baca juga:') && !txt.includes('Gambas:')) {
          paragraphs.push(txt);
        }
      });

      const finalContent = paragraphs.slice(0, 12).join('\n\n');

      if (!finalContent || finalContent.length < 100) {
        throw new Error("Konten terlalu pendek atau terblokir");
      }

      return res.status(200).json({ content: finalContent });

    } catch (e) {
      console.error("Scraper Error:", e.message);
      return res.status(200).json({ 
        content: "Sistem gagal menembus enkripsi website sumber. Hal ini wajar karena proteksi hak cipta. \n\nSilakan klik tombol 'Kunjungi Sumber Asli' di bawah untuk membaca langsung di website resminya.",
        isError: true 
      });
    }
  }

  // MODE RSS FEED (LIST BERITA)
  try {
    const rssRes = await axios.get('https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id');
    const $ = cheerio.load(rssRes.data, { xmlMode: true });
    const items = [];

    $('item').slice(0, 18).each((i, el) => {
      const title = $(el).find('title').text();
      items.push({
        id: i,
        title: title,
        link: $(el).find('link').text(),
        date: $(el).find('pubDate').text(),
        image: `https://picsum.photos/seed/${encodeURIComponent(title.substring(0,15))}/1200/800`
      });
    });

    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: 'Satelit gagal sinkron' });
  }
}
