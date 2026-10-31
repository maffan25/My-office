/* Bank soal bawaan. Diisi dari PDF bank soal (format: lihat contoh di bawah).
   a = indeks jawaban benar (0 = A, 1 = B, ...) atau hurufnya ("B"). e = pembahasan (opsional). */
window.MO_EXAM_BANKS = [
  {
    id: 'contoh-dasar',
    title: 'Contoh bank soal (ganti dengan PDF-mu)',
    course: 'Contoh',
    questions: [
      { q: 'Satuan data digital terkecil adalah …', o: ['Byte', 'Bit', 'Nibble', 'Kilobyte'], a: 1, e: 'Bit (binary digit) hanya bernilai 0 atau 1. Satu byte terdiri dari 8 bit.' },
      { q: 'Hasil dari 12 × 8 adalah …', o: ['86', '92', '96', '108'], a: 2, e: '12 × 8 = (10 × 8) + (2 × 8) = 80 + 16 = 96.' },
      { q: 'Bahasa markup yang dipakai untuk menyusun struktur halaman web adalah …', o: ['CSS', 'HTML', 'SQL', 'Python'], a: 1 },
      { q: 'Planet terbesar di tata surya adalah …', o: ['Saturnus', 'Neptunus', 'Jupiter', 'Bumi'], a: 2 },
      { q: 'Sebuah mata kuliah 3 SKS dengan nilai A (bobot 4,0) menyumbang berapa poin mutu?', o: ['4', '7', '12', '3'], a: 2, e: 'Poin mutu = SKS × bobot nilai = 3 × 4,0 = 12.' }
    ]
  }
];
