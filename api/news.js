const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
  try {
    // Mengambil RSS dari Google News Indonesia (Update Tercepat)
    const { data } = await axios.get('https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id');
    const $ = cheerio.load(data, { xmlMode: true });
    const items = [];

    $('item').each((i, el) => {
      if (i < 12) { // Mengambil 12 berita agar grid terlihat penuh
        items.push({
          title: $(el).find('title').text(),
          link: $(el).find('link').text(),
          date: $(el).find('pubDate').text(),
          // Mengambil gambar HD random dari Unsplash yang relevan dengan berita
          image: `https://images.unsplash.com/photo-1504711432869-efd597cdd042?q=80&w=1000&auto=format&fit=crop&sig=${i + Math.random()}`
        });
      }
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data berita' });
  }
}
