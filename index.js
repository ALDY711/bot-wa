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
    const phoneNumber = await ask('Masukkan nomor WhatsApp BOT (contoh: 628123456789): ');
    const code = await sock.requestPairingCode(phoneNumber.trim());
    console.log(`\nKode pairing kamu: ${code}`);
    console.log('Buka WhatsApp > Perangkat Tertaut > Tautkan dengan nomor telepon\n');
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
      if (msg.key.remoteJid?.endsWith('@g.us')) return; // abaikan grup — bot khusus chat pribadi

      // === FILTER UTAMA: hanya OWNER yang bisa memerintah bot ini ===
      if (msg.key.remoteJid !== OWNER_JID) return;

      const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
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
