// index.js
// Bot WhatsApp pribadi — HANYA merespon nomor owner yang dikonfigurasi di config.js.
// Pesan dari nomor lain atau dari grup otomatis diabaikan.

const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const QRCode = require('qrcode');
const readline = require('readline');

const config = require('./config');
const { handleGet, handleSsweb, closeBrowser } = require('./commands');

const OWNER_JID = `${config.ownerNumber}@s.whatsapp.net`;
const usePairingCode = process.argv.includes('--pairing-code');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
  });

  // --- Login: QR code (default) atau pairing code (jalankan `npm run pairing`) ---
  if (usePairingCode && !sock.authState.creds.registered) {
    let phoneNumber = process.env.PAIRING_NUMBER;
    if (!phoneNumber) {
      phoneNumber = await ask('Masukkan nomor WhatsApp BOT (contoh: 628123456789): ');
    }
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber.trim());
        console.log(`\nKode pairing kamu: ${code}`);
        console.log('Buka WhatsApp > Perangkat Tertaut > Tautkan dengan nomor telepon\n');
      } catch (err) {
        console.error('Gagal meminta kode pairing:', err);
      }
    }, 3000);
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !usePairingCode) {
      console.log('\nScan QR code ini dengan WhatsApp (Perangkat Tertaut > Tautkan Perangkat):\n');
      console.log(await QRCode.toString(qr, { type: 'terminal', small: true }));
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(
        'Koneksi terputus.',
        shouldReconnect ? 'Menyambung ulang...' : 'Logout — hapus folder session lalu jalankan ulang.'
      );
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('Bot berhasil terhubung ke WhatsApp!');
      console.log(`Bot hanya akan merespon nomor owner: ${config.ownerNumber}`);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg?.message) return;
      // if (msg.key.remoteJid?.endsWith('@g.us')) return; // Baris ini dimatikan agar bot bisa di grup

      // === FILTER UTAMA: hanya OWNER yang bisa memerintah bot ini ===
      // Pesan valid jika dikirim dari HP Anda sendiri (fromMe) atau nomor owner
      const sender = msg.key.participant || msg.key.remoteJid;
      const isOwner = msg.key.fromMe || (sender && sender.includes(config.ownerNumber));
      
      // Jika ingin SEMUA ORANG bisa pakai bot, beri tanda // di awal baris berikut:
      if (!isOwner) return;

      const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      console.log(`[DEBUG] Pesan owner terdeteksi: ${body}`);

      if (!body.startsWith(config.prefix)) return;

      const [rawCmd, ...args] = body.slice(config.prefix.length).trim().split(/\s+/);
      const cmd = rawCmd.toLowerCase();
      const text = args.join(' ');
      const jid = msg.key.remoteJid;

      if (cmd === 'get') {
        await handleGet(sock, jid, text);
      } else if (cmd === 'ssweb') {
        await handleSsweb(sock, jid, text);
      } else if (cmd === 'menu' || cmd === 'help') {
        await sock.sendMessage(jid, {
          text: `*Menu Bot Pribadi*\n\n${config.prefix}get <url>\n${config.prefix}ssweb <url>`,
        });
      }
    } catch (err) {
      console.error('Error saat proses pesan:', err);
    }
  });
}

process.on('uncaughtException', (err) => console.error('Uncaught exception:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
process.on('SIGINT', async () => {
  console.log('\nMenutup bot...');
  await closeBrowser();
  process.exit(0);
});

startBot();
