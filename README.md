# Bot WhatsApp Pribadi — `.get` & `.ssweb`

Bot WhatsApp yang **hanya bisa dipakai oleh owner** (nomor yang kamu daftarkan sendiri di `config.js`). Pesan dari nomor lain, atau dari grup, otomatis diabaikan sepenuhnya — bukan sekadar tidak dibalas.

Dibangun dengan [Baileys](https://github.com/WhiskeySockets/Baileys) (konek ke WhatsApp tanpa browser) + [Puppeteer](https://pptr.dev) khusus untuk fitur screenshot.

## Fitur

| Command | Fungsi |
|---|---|
| `.get <url>` | HTTP GET ke URL yang diberikan, membalas status code + isi respons. Untuk cek/test API cepat. |
| `.ssweb <url>` | Mengambil screenshot halaman website, dikirim sebagai gambar. |
| `.menu` | Menampilkan daftar command. |

## 1. Prasyarat

- Node.js **v20 atau lebih baru** — cek dengan `node -v`.
- Nomor WhatsApp untuk bot (boleh nomor utama kamu, boleh juga nomor kedua khusus bot).

## 2. Instalasi

```bash
npm install
```

Puppeteer otomatis mengunduh Chromium (~200–300MB) saat instalasi pertama. Kalau dijalankan di VPS Linux minimal dan `.ssweb` error terkait *shared library*, install dependency ini dulu:

```bash
sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
```

## 3. Konfigurasi — bagian paling penting

Buka `config.js`, ganti `ownerNumber` dengan nomor WhatsApp **kamu sendiri** (yang boleh mengontrol bot), format internasional tanpa `+`/spasi/strip:

```js
ownerNumber: '628123456789',
```

Ini yang membuat bot bersifat pribadi: siapa pun yang chat ke nomor bot selain nomor ini akan diabaikan total oleh bot (tidak dibalas apa pun, command apa pun).

## 4. Menjalankan

**Opsi A — Login via QR code** (default):
```bash
npm start
```
Scan QR yang muncul di terminal: WhatsApp → **Perangkat Tertaut** → **Tautkan Perangkat**.

**Opsi B — Login via kode pairing** (tanpa scan QR):
```bash
npm run pairing
```
Masukkan nomor WhatsApp bot saat diminta, lalu masukkan kode yang muncul di WhatsApp → **Perangkat Tertaut** → **Tautkan dengan nomor telepon**.

Sesi login tersimpan di folder `session/`, jadi tidak perlu login ulang setiap kali menjalankan bot.

## 5. Cara pakai

Chat ke nomor bot **dari nomor owner**:
```
.get https://api.github.com
.ssweb example.com
.menu
```

## Catatan keamanan & privasi

- Bot mengabaikan semua pesan grup dan semua nomor selain `ownerNumber` — sengaja dibatasi hanya untuk kamu.
- Folder `session/` berisi kredensial login WhatsApp — setara akses penuh ke akun tersebut. Jangan commit ke Git atau bagikan ke siapa pun. Kalau pakai Git, buat `.gitignore`:
  ```
  node_modules/
  session/
  ```
- Gunakan bot secara wajar sesuai Ketentuan Layanan WhatsApp: hindari spam atau pesan otomatis massal ke orang lain. Bot ini didesain untuk perkakas pribadi, bukan untuk mengirim pesan ke orang lain.

## Struktur file

```
wa-bot-pribadi/
├── config.js      # nomor owner, prefix command
├── commands.js     # logic .get dan .ssweb
├── index.js        # koneksi WhatsApp + routing command
├── package.json
└── README.md
```
