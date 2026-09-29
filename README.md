Smart-Draft Smart Auto Formatting Tool for Student
# Smart-Draft

Smart-Draft adalah alat berbasis web untuk memeriksa dan memperbaiki format dokumen akademik berformat `.docx`. Alat ini mengecek margin, jenis dan ukuran font, spasi, serta perataan teks, lalu mencocokkannya dengan pedoman penulisan Telkom University.

Coba langsung: [smartdraftv1.netlify.app](https://smartdraftv1.netlify.app/)

## Kenapa dibuat

Banyak mahasiswa harus revisi berkali-kali bukan karena isi tulisannya bermasalah, tapi karena hal teknis: margin tidak sesuai (misalnya pola 4-4-3-3), ukuran font judul tidak seragam, atau hanging indent daftar pustaka salah. Mengecek ratusan halaman Word satu per satu bisa makan waktu berjam-jam, dan tetap ada yang terlewat. Ditambah lagi, tidak semua orang paham fitur Word seperti Styles atau Section Breaks.

Smart-Draft dibuat supaya urusan format tidak lagi menyita waktu yang seharusnya dipakai untuk menulis.

## Cara kerja

1. **Upload.** Seret file `.docx` ke area unggah. Ukuran file yang didukung sampai 50 MB. Ringkasan aturan yang akan diperiksa ditampilkan di halaman yang sama.
2. **Scanning.** Aplikasi membaca struktur XML di dalam file `.docx`, lalu memeriksa tiap bagian dokumen terhadap aturan format. Progresnya terlihat langsung di layar.
3. **Review.** Hasilnya berupa skor kepatuhan format dan daftar temuan per bab atau kategori. Anda bisa menyalakan atau mematikan tiap temuan, jadi tidak ada perubahan yang diterapkan tanpa sepengetahuan Anda.
4. **Selesai.** Klik satu tombol untuk memperbaiki temuan yang dipilih, lalu unduh file barunya. Isi teks asli tidak diubah. Ada juga ringkasan hasil, misalnya "24 isu margin dan font berhasil diperbaiki".

## Yang diperiksa

- Margin halaman
- Jenis dan ukuran font
- Perataan teks
- Spasi baris dan spasi antarparagraf

## Proses perancangan (design thinking)

### Empathize

Pengguna yang kami bayangkan adalah mahasiswa tingkat akhir, mahasiswa pascasarjana, dan akademisi muda yang sedang menyusun skripsi, tesis, atau makalah. Masalah yang paling sering muncul:

- Revisi berulang karena kesalahan format, bukan substansi.
- Pengecekan manual memakan waktu berjam-jam sampai berhari-hari.
- Cemas berkas ditolak saat pengajuan sidang atau publikasi hanya karena format.
- Fitur Word tingkat lanjut belum dikuasai.

### Define

> Mahasiswa butuh cara yang cepat, akurat, dan otomatis untuk memastikan dokumennya sesuai standar format, tanpa harus memeriksa setiap halaman secara manual yang rawan salah.

Dari situ muncul dua pertanyaan pemandu:

- Bagaimana membantu mahasiswa menemukan inkonsistensi format dalam hitungan detik?
- Bagaimana memberi mereka kendali penuh atas perbaikan otomatis, tanpa membuat prosesnya jadi buram?

### Ideate

Beberapa keputusan desain yang kami ambil:

- **Scan otomatis.** Aplikasi mendeteksi pelanggaran margin, tipografi, perataan, dan spasi langsung dari struktur file.
- **Review sebelum perbaikan.** Perbaikan otomatis tanpa konfirmasi terasa berisiko, jadi setiap temuan bisa dinyalakan atau dimatikan.
- **Perbaikan satu klik.** Setelah memilih, pengguna cukup menekan satu tombol dan mengunduh hasilnya.

### Prototype

Prototipe berupa web responsif dengan empat tampilan: upload, scanning, review, dan success. Alurnya sengaja dibuat pendek supaya bisa dipakai tanpa panduan.

### Test

Target yang kami pakai untuk menilai prototipe:

- Waktu pengecekan turun dari sekitar 2 sampai 4 jam menjadi kurang dari 1 menit.
- Akurasi deteksi font, margin, dan spasi di atas 95%.
- Pengguna bisa menyelesaikan alur dari upload sampai unduh tanpa bantuan.

Masukan yang sudah dicatat untuk iterasi berikutnya:

- Pilihan template pedoman, karena aturan tiap kampus bisa berbeda.
- Unduhan log perubahan supaya pengguna tahu persis apa yang diubah.

## Catatan

Smart-Draft saat ini mengacu pada pedoman Telkom University. Dukungan untuk pedoman kampus lain belum tersedia.

## Kredit & Kontribusi

- **Ide & Konsep Awal**: @raiyanabz
Created by @riftarhman


