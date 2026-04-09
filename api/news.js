const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
  const { url } = req.query;

  // --- LOGIKA 1: DEEP ARTICLE SCRAPER (AMBIL TEXT FULL) ---
  if (url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
          'Cache-Control': 'no-cache'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Hapus sampah visual
      $('script, style, iframe, footer, nav, header, ads, .banner, .related, .video-container').remove();

      let paragraphs = [];
      
      // Selector khusus untuk media besar Indonesia agar akurat
      const contentSelectors = [
        '.detail__body-text', // Detik
        '.read__content',     // Kompas
        '.entry-content',     // Umum
        '.post-content',      // Umum
        '.article-content',   // Antara
        'article p',          // Standar HTML5
        '.content-article p'  // Republika
      ];

      $(contentSelectors.join(', ')).each((i, el) => {
        const text = $(el).text().trim();
        // Hanya ambil teks yang berbobot (lebih dari 50 karakter)
        if (text.length > 50 && !text.includes('Baca juga') && !text.includes('Simak Video')) {
          paragraphs.push(text);
        }
      });

      // Jika gagal dengan selector, coba ambil semua paragraf di body
      if (paragraphs.length === 0) {
        $('p').each((i, el) => {
          const text = $(el).text().trim();
          if (text.length > 70) paragraphs.push(text);
        });
      }

      const resultText = paragraphs.slice(0, 15).join('\n\n');

      return res.status(200).json({ 
        content: resultText || "Sistem keamanan situs sumber mendeteksi akses otomatis. \n\nKonten tidak dapat ditampilkan secara penuh untuk menghindari pelanggaran kebijakan. Silakan baca langsung di sumber aslinya melalui tombol di bawah." 
      });

    } catch (e) {
      return res.status(500).json({ content: "Gagal menghubungkan ke server sumber." });
    }
  }

  // --- LOGIKA 2: MULTI-SOURCE RSS AGGREGATOR ---
  try {
    // Kita ambil dari 3 sumber terpercaya sekaligus
    const sources = [
      'https://www.antaranews.com/rss/terpopuler.xml',
      'https://rss.republika.co.id/id/berita/nasional/',
      'https://www.tempo.co/rss/nasional'
    ];

    // Jalankan semua request secara paralel agar cepat
    const requests = sources.map(s => axios.get(s, { timeout: 5000 }));
    const results = await Promise.allSettled(requests);

    let allArticles = [];

    results.forEach((res, idx) => {
      if (res.status === 'fulfilled') {
        const $ = cheerio.load(res.value.data, { xmlMode: true });
        $('item').slice(0, 10).each((i, el) => {
          const title = $(el).find('title').text();
          const link = $(el).find('link').text();
          const pubDate = $(el).find('pubDate').text();
          
          // Penanganan Image HD
          let image = "https://images.unsplash.com/photo-1504711432869-efd597cdd042?q=80&w=1600"; // Default
          const description = $(el).find('description').text();
          const imgMatch = description.match(/src="([^"]+)"/);
          
          if (imgMatch) {
            image = imgMatch[1];
          } else {
            // Jika tidak ada di deskripsi, buat gambar HD berdasarkan keyword judul
            image = `https://picsum.photos/seed/${encodeURIComponent(title.substring(0,10))}/1600/900`;
          }

          allArticles.push({ title, link, date: pubDate, image });
        });
      }
    });

    // Acak urutan agar berita variatif
    allArticles = allArticles.sort(() => Math.random() - 0.5);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(allArticles);

  } catch (err) {
    res.status(500).json({ error: "Gagal memproses data aggregator." });
  }
}
