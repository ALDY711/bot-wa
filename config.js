// Konfigurasi bot — GANTI nilai di bawah sesuai kebutuhan kamu

module.exports = {
  // Nomor WhatsApp OWNER (pemilik bot), format internasional TANPA tanda "+", spasi, atau strip.
  // Contoh: nomor 0812-3456-7890 ditulis "628123456789"
  ownerNumber: '6285117741045',

  // Awalan (prefix) command. Dengan prefix ".", command ditulis ".get" atau ".ssweb"
  prefix: '.',

  // Folder untuk menyimpan sesi login WhatsApp.
  // JANGAN hapus folder ini setelah login berhasil, dan JANGAN pernah membagikannya ke siapa pun —
  // isinya setara dengan akses penuh ke akun WhatsApp yang dipakai bot.
  sessionDir: './session',
};
