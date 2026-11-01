# MyOffice — versi dioptimasi
Buka `index.html` (sama seperti sebelumnya). Edit kode di folder yang sama (file sumber), lalu jalankan `python3 build.py` untuk membuat ulang app.css / app.js / banks.js / index.html.
Perubahan utama: 47 request -> 5, font dimuat bertahap, loop kanvas menganggur dimatikan, efek klik ganda dihapus,
bintang pakai sprite 30fps, partikel latar jendela dikurangi di HP, bank soal dimuat saat idle, auto mode-hemat bila FPS rendah.

## Kalender: api pengingat & blok warna
- Ujian, presentasi, dan kegiatan penting menyala api mulai H-3 sampai hari-H (makin dekat makin besar & cepat).
- Lebih dari 3 hari: blok warna per jenis (Ujian merah, Presentasi ungu, Penting kuning-emas, lainnya warna kategori).
- Jenis dikenali otomatis dari judul/kategori, atau dipilih manual di kolom "Jenis kegiatan" saat membuat acara.
