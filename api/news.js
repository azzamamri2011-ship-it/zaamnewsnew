const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
  try {
    const { data } = await axios.get('https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id');
    const $ = cheerio.load(data, { xmlMode: true });
    const items = [];

    $('item').slice(0, 10).each((i, el) => {
      const title = $(el).find('title').text();
      items.push({
        id: i,
        title: title,
        link: $(el).find('link').text(),
        date: $(el).find('pubDate').text(),
        image: `https://picsum.photos/seed/${encodeURIComponent(title.substring(0,10))}/1200/800`,
        fullContent: `Laporan Spesial ZAAMNEWS: Mengenai "${title}". Informasi ini dikurasi secara otomatis oleh sistem cerdas yang dikembangkan oleh Zaam. Berita ini memberikan gambaran mendalam mengenai topik yang sedang tren saat ini, disajikan dengan resolusi gambar tinggi dan akses cepat langsung di dalam dashboard tanpa perlu berpindah aplikasi.`
      });
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: 'Gagal sinkronisasi berita' });
  }
}
