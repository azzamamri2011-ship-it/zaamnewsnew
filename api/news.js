const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
  const { url } = req.query;

  // MODE 1: SCRAPER ARTIKEL FULL
  if (url) {
    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
        },
        timeout: 5000
      });
      const $ = cheerio.load(data);
      
      // Menghapus elemen yang tidak perlu agar tidak ikut ter-scrape
      $('script, style, nav, footer, header, ads, .ads, #ads').remove();

      let paragraphs = [];
      // Mencari teks di dalam tag p, article, atau div content
      $('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 40) paragraphs.push(text);
      });

      // Gabungkan paragraf dan kirim
      const fullText = paragraphs.slice(0, 15).join('\n\n');
      return res.status(200).json({ 
        content: fullText || "Maaf, konten tidak dapat dimuat secara otomatis. Silakan klik 'Kunjungi Sumber Asli'." 
      });
    } catch (e) {
      return res.status(500).json({ content: "Gagal mengambil artikel lengkap karena proteksi situs sumber." });
    }
  }

  // MODE 2: AMBIL DAFTAR BERITA TERBARU
  try {
    const { data } = await axios.get('https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id');
    const $ = cheerio.load(data, { xmlMode: true });
    const items = [];

    $('item').slice(0, 15).each((i, el) => {
      const title = $(el).find('title').text();
      items.push({
        id: i,
        title: title,
        link: $(el).find('link').text(),
        date: $(el).find('pubDate').text(),
        // Gambar HD 1600x900 dengan seed judul unik
        image: `https://picsum.photos/seed/${encodeURIComponent(title.substring(0, 12))}/1600/900`
      });
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar berita' });
  }
}
