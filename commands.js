// commands.js
// Logic untuk 2 fitur bot: .get dan .ssweb

const axios = require('axios');
const puppeteer = require('puppeteer');

const GET_TIMEOUT_MS = 15_000;
const GET_MAX_CHARS = 3500; // batas panjang balasan biar tidak kepotong WhatsApp
const GET_MAX_BYTES = 5 * 1024 * 1024; // 5MB, biar bot tidak macet kalau responnya kegedean

const SS_TIMEOUT_MS = 30_000;

// Browser Puppeteer dibuat sekali saja lalu dipakai ulang, biar .ssweb tidak lambat setiap request
let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserPromise;
}

// ===== FITUR 1: .get <url> =====
// Melakukan HTTP GET ke url yang diberikan dan membalas status + isi responnya.
// Berguna untuk cek/test API secara cepat langsung dari WhatsApp.
async function handleGet(sock, jid, text) {
  const url = text.trim();

  if (!url) {
    return sock.sendMessage(jid, {
      text: 'Format salah.\n\nCara pakai: *.get <url>*\nContoh: .get https://api.github.com',
    });
  }

  if (!/^https?:\/\//i.test(url)) {
    return sock.sendMessage(jid, { text: 'URL harus diawali dengan http:// atau https://' });
  }

  try {
    const res = await axios.get(url, {
      timeout: GET_TIMEOUT_MS,
      responseType: 'text',
      transformResponse: (data) => data, // tampilkan mentah, jangan di-parse otomatis
      maxContentLength: GET_MAX_BYTES,
      maxBodyLength: GET_MAX_BYTES,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; personal-wa-bot)' },
      validateStatus: () => true, // status non-2xx tetap ditampilkan, bukan dianggap error
    });

    let body = res.data;
    let isJson = false;
    try {
      // Coba ubah response ke JSON, lalu buat pretty print
      const parsed = JSON.parse(body);
      body = JSON.stringify(parsed, null, 2);
      isJson = true;
    } catch (e) {
      // Jika gagal, berarti bukan JSON, tampilkan apa adanya
    }

    // Gunakan blok kode WA (```) jika itu JSON supaya tampilannya rapi
    let formattedBody = isJson ? `\`\`\`json\n${body}\n\`\`\`` : body;
    let output = `*Status:* ${res.status}\n*Content-Type:* ${res.headers['content-type'] || '-'}\n\n${formattedBody}`;

    if (output.length > GET_MAX_CHARS) {
      output = `${output.slice(0, GET_MAX_CHARS)}\n\n...(dipotong, respons terlalu panjang)`;
    }

    await sock.sendMessage(jid, { text: output });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal GET request:\n${err.message}` });
  }
}

// ===== FITUR 2: .ssweb <url> =====
// Mengambil screenshot sebuah halaman website dan mengirimkannya sebagai gambar.
async function handleSsweb(sock, jid, text) {
  let url = text.trim();

  if (!url) {
    return sock.sendMessage(jid, {
      text: 'Format salah.\n\nCara pakai: *.ssweb <url>*\nContoh: .ssweb example.com',
    });
  }

  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  let page;
  try {
    await sock.sendMessage(jid, { text: `Mengambil screenshot ${url} ...` });

    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: SS_TIMEOUT_MS });

    const buffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 80 });

    await sock.sendMessage(jid, { image: buffer, caption: `Screenshot: ${url}` });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal mengambil screenshot:\n${err.message}` });
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

// Menutup browser Puppeteer dengan rapi saat bot dimatikan
async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close().catch(() => {});
    browserPromise = null;
  }
}

module.exports = { handleGet, handleSsweb, closeBrowser };
