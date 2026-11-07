# Beresin — versi dioptimasi
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

## Revisi v1.3
- redesign.css (dimuat paling akhir): tampilan Academic baru + perbaikan gambar & penanda pilihan di Organization.
- Academic: panel fokus (tugas terdekat + angka ringkas), sampul mata kuliah dengan cincin progres, timeline tenggat, kartu prioritas. Logika di academic.js (vDash, cCard).
- Organization: gambar ditampilkan utuh (contain di atas salinan buram), tanpa bingkai hijau tebal; kartu terpilih cukup terangkat dengan halo tipis. Logika di org-shop.js (fit, art).
- Jalankan `python3 build.py` setelah mengedit file sumber.

## Revisi v2.1
- revisi3.css (paling akhir): kotak tambah organisasi presisi, tab Task rata tengah, centang tunggal, pensil Finance, teks Goal, kartu Document Center, tampilan PC lebih besar.
- documents.js: sampul kustom (dokumen & rak), rating, halaman keterangan, pembaca dalam aplikasi (pdf.js di folder pdfjs/, perlu dibuka lewat http/Vercel; dari file:// memakai penampil bawaan).
- Catatan: folder icons/ tidak ada di zip, jadi app.js/app.css diperbarui langsung (bukan lewat build.py). Jika icons/ dikembalikan, build.py tetap bisa dipakai.

## Revisi v2.2
- revisi4.js + revisi4.css (paling akhir): efek angka menghitung naik di semua modul (beranda, Academic, Task, Finance, Work, Organization, Goal, Analytics); pensil Katalog Finance tidak menembus bar menu; label prioritas terpilih berwarna pastel + centang (tidak gelap); alat di rak Document Center disembunyikan; judul dokumen kini di bawah sampul.
- Aksi dokumen (Unduh, Ubah sampul, Edit, Hapus) tetap ada di halaman keterangan (ketuk sampul). Tombol Hapus ditambahkan di sana.
- Hitung-naik lama (premium.js, tasks.js) dinonaktifkan otomatis oleh revisi4.js agar tidak bentrok.
- app.js/app.css sudah diperbarui langsung (icons/ tidak ada di zip); revisi4 juga terdaftar di index.src.html & build.py.

## Revisi v2.3
- revisi5.css (paling akhir): kolom pencarian Document Center presisi (tinggi seragam dengan tab, ikon & teks sejajar, tanpa kotak-dalam); kotak dokumen di Terbaru/Semua dokumen/hasil cari bergradasi off-white lembut (mint, persik, lavender, langit, rose, butter); ikon kalender & jam di dashboard besar tanpa latar, bergaya ikon menu.
- app.css sudah diperbarui langsung (revisi5 ditambahkan di akhir), sama seperti revisi sebelumnya.

## Revisi v2.4
- revisi5.js (+ bagian 4–5 di revisi5.css): satu mesin notifikasi untuk lonceng & panel (BeresinNotif). Mesin lonceng lama di v6.js dan hud.js dimatikan agar tidak bentrok.
- Aturan: tenggat (tugas, to-do, pekerjaan, goal, dll) = terlambat / hari ini / besok; kegiatan & acara berjam = muncul H-1 jam (atau lebih awal bila pengingat Kalender lebih panjang), lalu "Berlangsung"; kegiatan seharian = hari-H (ujian/presentasi/penting juga H-1). Selesai/dibatalkan tidak dihitung.
- Angka lonceng = jumlah item di panel (1 pengingat → 1). Dihitung ulang saat data 'mo-*' disimpan, saat tab difokuskan, dan tiap 20 detik.
- Logo: lambang melayang/miring dengan kilau & percikan; tulisan "Beresin" muncul huruf demi huruf dari kiri (dengan kursor), tahan, lalu menghilang dari kiri, berulang. Tempo diatur lewat `--bs-cycle` (siklus) dan `--bs-step` (jeda antar huruf) di revisi5.css.
- app.js/app.css diperbarui langsung (icons/ tidak ada di zip).
