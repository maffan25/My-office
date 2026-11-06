# Tema MyOffice — palet tunggal Biru & Beige
- Semua tampilan ada di `playful.css` (dimuat terakhir, menimpa tema lama).
- Warna utama: biru #3b66e8 / biru tua #2447b8 / navy #14224a, beige #f3e7d3 / krem #fbf5e9 / pasir #e4cb9c.
- Setelah mengubah file sumber jalankan `python3 build.py` untuk membuat ulang index.html, app.css, app.js.

## Tema PASTEL (versi terbaru)
- Lapisan utama ada di `tema-pastel.css` (dimuat paling akhir, setelah playful.css). Latar kabut biru-abu, kartu putih melengkung, aksen biru cerah.
- Warna tiap menu didefinisikan di `html[data-menu=...]` sebagai `--mc` (warna utama) dan `--mci` (warna teks di atas warna utama). Menu: academic biru, work oranye, organization hijau, project violet, task kuning, calendar pink, finance teal, goal merah, documents cyan, analytics ungu, settings abu-abu.
- `tema-pastel.js` menandai menu yang dibuka di `<html data-menu>`.
- Sapaan beranda: "Hai, 👋🏻" kecil di atas dan nama besar di bawah (diatur di `cosmos.js`).
- Tetap jalankan `python3 build.py` setelah mengubah file sumber.
