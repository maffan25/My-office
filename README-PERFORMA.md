# MyOffice — versi dioptimasi
Buka `index.html` (sama seperti sebelumnya). Edit kode di folder yang sama (file sumber), lalu jalankan `python3 build.py` untuk membuat ulang app.css / app.js / banks.js / index.html.
Perubahan utama: 47 request -> 5, font dimuat bertahap, loop kanvas menganggur dimatikan, efek klik ganda dihapus,
bintang pakai sprite 30fps, partikel latar jendela dikurangi di HP, bank soal dimuat saat idle, auto mode-hemat bila FPS rendah.

## Kalender: api pengingat & blok warna
- Ujian, presentasi, dan kegiatan penting menyala api mulai H-3 sampai hari-H (makin dekat makin besar & cepat).
- Lebih dari 3 hari: blok warna per jenis (Ujian merah, Presentasi ungu, Penting kuning-emas, lainnya warna kategori).
- Jenis dikenali otomatis dari judul/kategori, atau dipilih manual di kolom "Jenis kegiatan" saat membuat acara.

## Ikon animasi (v8.7)
- Ikon menu/jam/lonceng/buku kini SVG berlapis (icons-live.js + icons-live.css), bukan PNG yang digoyang. Tiap bagian bergerak sendiri:
  jarum jam berputar, gir berputar, batang grafik tumbuh + panah tergambar, panah menancap di sasaran, lonceng berdering, koin berputar, dst.
- Animasi hanya jalan saat ikon terlihat; mati jika sistem meminta "kurangi gerakan". Saat ikon diklik, geraknya dipercepat sebelum modul terbuka.
- Edit gambar/gerak di icons-live.js (bentuk) dan icons-live.css (gerak), lalu `python3 build.py`.
## Kalender
- cal-polish.css: badge jenis kegiatan (teks putih/cokelat tua di atas gradasi) dan tombol "Kembali ke hari ini" bergaya pil gradasi dengan ikon.
