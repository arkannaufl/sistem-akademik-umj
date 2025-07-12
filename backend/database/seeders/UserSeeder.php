<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\MataKuliah;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Data mahasiswa kedokteran dengan nama dan username yang realistis (100 data)
        $mahasiswaData = [
            ['name' => 'Ahmad Rizki Pratama', 'username' => 'ahmadrizki'],
            ['name' => 'Siti Nurhaliza', 'username' => 'sitinur'],
            ['name' => 'Budi Santoso', 'username' => 'budisantoso'],
            ['name' => 'Rina Kartika Sari', 'username' => 'rinakartika'],
            ['name' => 'Deni Kurniawan', 'username' => 'denikurnia'],
            ['name' => 'Fitri Handayani', 'username' => 'fitrihanda'],
            ['name' => 'Agung Setiawan', 'username' => 'agungsetia'],
            ['name' => 'Maya Sari Dewi', 'username' => 'mayasari'],
            ['name' => 'Reza Fahlevi', 'username' => 'rezafahlevi'],
            ['name' => 'Indah Permatasari', 'username' => 'indahpermata'],
            ['name' => 'Eko Prasetyo', 'username' => 'ekoprasetyo'],
            ['name' => 'Wulan Dari', 'username' => 'wulandari'],
            ['name' => 'Arif Rahman', 'username' => 'arifrahman'],
            ['name' => 'Dinda Ayu Lestari', 'username' => 'dindaayu'],
            ['name' => 'Fajar Nugraha', 'username' => 'fajarnugraha'],
            ['name' => 'Cantika Putri', 'username' => 'cantikaputri'],
            ['name' => 'Gilang Ramadhan', 'username' => 'gilangrama'],
            ['name' => 'Hana Safitri', 'username' => 'hanasafitri'],
            ['name' => 'Ivan Pradipta', 'username' => 'ivanpradipta'],
            ['name' => 'Kirana Maharani', 'username' => 'kiranamaharani'],
            ['name' => 'Lukas Wijaya', 'username' => 'lukaswijaya'],
            ['name' => 'Melati Kusuma', 'username' => 'melatikusuma'],
            ['name' => 'Naufal Akbar', 'username' => 'naufalakbar'],
            ['name' => 'Olivia Sari', 'username' => 'oliviasari'],
            ['name' => 'Putra Mahendra', 'username' => 'putramahendra'],
            ['name' => 'Qonita Zahrani', 'username' => 'qonitazahrani'],
            ['name' => 'Ridho Pratama', 'username' => 'ridhopratama'],
            ['name' => 'Sabrina Dewi', 'username' => 'sabrinadewi'],
            ['name' => 'Taufik Hidayat', 'username' => 'taufikhidayat'],
            ['name' => 'Ulfa Rahmawati', 'username' => 'ulfarahmawati'],
            ['name' => 'Vina Anggraini', 'username' => 'vinaanggraini'],
            ['name' => 'Wahyu Nugroho', 'username' => 'wahyunugroho'],
            ['name' => 'Xenia Putri', 'username' => 'xeniaputri'],
            ['name' => 'Yusuf Rahman', 'username' => 'yusufrahman'],
            ['name' => 'Zahra Amelia', 'username' => 'zahraamelia'],
            ['name' => 'Aldi Firmansyah', 'username' => 'aldifirmansyah'],
            ['name' => 'Bella Kartika', 'username' => 'bellakartika'],
            ['name' => 'Candra Wijaya', 'username' => 'candrawijaya'],
            ['name' => 'Dila Ramadhani', 'username' => 'dilaramadhani'],
            ['name' => 'Eka Purnama', 'username' => 'ekapurnama'],
            ['name' => 'Farid Setiawan', 'username' => 'faridsetiawan'],
            ['name' => 'Gina Permata', 'username' => 'ginapermata'],
            ['name' => 'Hendra Kurnia', 'username' => 'hendrakurnia'],
            ['name' => 'Intan Sari', 'username' => 'intansari'],
            ['name' => 'Jihan Maharani', 'username' => 'jihanmaharani'],
            ['name' => 'Krisna Bayu', 'username' => 'krisnabayu'],
            ['name' => 'Laila Nurjannah', 'username' => 'lailanurjannah'],
            ['name' => 'Muhammad Iqbal', 'username' => 'muhammadiqbal'],
            ['name' => 'Nadia Fitriani', 'username' => 'nadiafitriani'],
            ['name' => 'Oscar Ramadhan', 'username' => 'oscarramadhan'],
            ['name' => 'Priska Dewi', 'username' => 'priskadewi'],
            ['name' => 'Qori Ananda', 'username' => 'qoriananda'],
            ['name' => 'Rian Saputra', 'username' => 'riansaputra'],
            ['name' => 'Shinta Maharani', 'username' => 'shintamaharani'],
            ['name' => 'Teguh Santoso', 'username' => 'teguhsantoso'],
            ['name' => 'Umi Kalsum', 'username' => 'umikalsum'],
            ['name' => 'Vera Angeline', 'username' => 'veraangeline'],
            ['name' => 'Wira Kusuma', 'username' => 'wirakusuma'],
            ['name' => 'Ximena Putri', 'username' => 'ximenaputri'],
            ['name' => 'Yoga Pratama', 'username' => 'yogapratama'],
            ['name' => 'Zulfa Maharani', 'username' => 'zulfamaharani'],
            ['name' => 'Alvin Pradana', 'username' => 'alvinpradana'],
            ['name' => 'Bianca Safira', 'username' => 'biancasafira'],
            ['name' => 'Citra Kencana', 'username' => 'citrakencana'],
            ['name' => 'David Setiadi', 'username' => 'davidsetiadi'],
            ['name' => 'Elena Maharani', 'username' => 'elenamaharani'],
            ['name' => 'Felix Gunawan', 'username' => 'felixgunawan'],
            ['name' => 'Ghina Azzahra', 'username' => 'ghinaazzahra'],
            ['name' => 'Hafiz Rahman', 'username' => 'hafizrahman'],
            ['name' => 'Ika Puspita', 'username' => 'ikapuspita'],
            ['name' => 'Joko Susilo', 'username' => 'jokosusilo'],
            ['name' => 'Kayla Sari', 'username' => 'kaylasari'],
            ['name' => 'Lingga Wijaya', 'username' => 'linggawijaya'],
            ['name' => 'Mira Anggraini', 'username' => 'miraanggraini'],
            ['name' => 'Nizar Hakim', 'username' => 'nizarhakim'],
            ['name' => 'Okta Pratama', 'username' => 'oktapratama'],
            ['name' => 'Putri Cahaya', 'username' => 'putricahaya'],
            ['name' => 'Qasim Nuraini', 'username' => 'qasimnuraini'],
            ['name' => 'Rania Safitri', 'username' => 'raniasafitri'],
            ['name' => 'Satria Kusuma', 'username' => 'satriakusuma'],
            ['name' => 'Tiara Melati', 'username' => 'tiaramelati'],
            ['name' => 'Umar Farouk', 'username' => 'umarfarouk'],
            ['name' => 'Viona Permata', 'username' => 'vionapermata'],
            ['name' => 'Widi Prabowo', 'username' => 'widiprabowo'],
            ['name' => 'Xavier Pratama', 'username' => 'xavierpratama'],
            ['name' => 'Yasmin Fitria', 'username' => 'yasminfitria'],
            ['name' => 'Zaki Ramadhan', 'username' => 'zakiramadhan'],
            ['name' => 'Aulia Rahman', 'username' => 'auliarahman'],
            ['name' => 'Bima Sakti', 'username' => 'bimasakti'],
            ['name' => 'Clara Indira', 'username' => 'claraindira'],
            ['name' => 'Dani Kurniawan', 'username' => 'danikurniawan'],
            ['name' => 'Elsa Purnama', 'username' => 'elsapurnama'],
            ['name' => 'Fahri Aditya', 'username' => 'fahriaditya'],
            ['name' => 'Galuh Maharani', 'username' => 'galuhmaharani'],
            ['name' => 'Husni Mubarak', 'username' => 'husnimubarak'],
            ['name' => 'Irma Suryani', 'username' => 'irmasuryani'],
            ['name' => 'Jefri Setiawan', 'username' => 'jefrisetiawan'],
            ['name' => 'Keisya Permata', 'username' => 'keisyapermata'],
            ['name' => 'Luthfi Hakim', 'username' => 'luthfihakim'],
            ['name' => 'Mila Kusuma', 'username' => 'milakusuma'],
            ['name' => 'Nanda Pratiwi', 'username' => 'nandapratiwi'],
            ['name' => 'Oki Saputra', 'username' => 'okisaputra'],
            ['name' => 'Prita Maharani', 'username' => 'pritamaharani'],
            ['name' => 'Qirana Dewi', 'username' => 'qiranadewi'],
            ['name' => 'Raka Wijaya', 'username' => 'rakawijaya'],
            ['name' => 'Sari Purnama', 'username' => 'saripurnama'],
            ['name' => 'Tito Raharjo', 'username' => 'titoraharjo'],
            ['name' => 'Ulfah Rahmawati', 'username' => 'ulfahrahmawati']
        ];

        // Tambahkan semester acak untuk setiap mahasiswa
        foreach ($mahasiswaData as &$mhs) {
            $mhs['semester'] = rand(1, 8);
        }
        unset($mhs);

        // Data dosen dengan nama yang realistis dan peran yang sesuai dengan mata kuliah
        $dosenData = [
            // Semester 1 - Dasar-dasar Kedokteran
            ['name' => 'Dr. Andika Putra Wijaya', 'username' => 'andikaw', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB101'],
            ['name' => 'Dr. Sari Indah Sari', 'username' => 'sariindah', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB101'],
            ['name' => 'Dr. Bambang Tri Hartono', 'username' => 'bambanghartono', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Dasar-dasar Kedokteran'],
            
            // Semester 1 - Anatomi Dasar
            ['name' => 'Dr. Dewi Ratna Sari', 'username' => 'dewiratna', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB102'],
            ['name' => 'Dr. Eko Budi Santoso', 'username' => 'ekobudi', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB102'],
            ['name' => 'Dr. Fitria Maharani', 'username' => 'fitriamaharani', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Anatomi Dasar'],
            
            // Semester 1 - Fisiologi Dasar
            ['name' => 'Dr. Gunawan Setiadi', 'username' => 'gunawansetiadi', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB103'],
            ['name' => 'Dr. Hesti Kumalasari', 'username' => 'hestikumala', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB103'],
            ['name' => 'Dr. Irfan Maulana', 'username' => 'irfanmaulana', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Fisiologi Dasar'],
            
            // Semester 1 - Biokimia Dasar
            ['name' => 'Dr. Joko Widodo Pranoto', 'username' => 'jokowidodo', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB104'],
            ['name' => 'Prof. Dr. Citra Kirana', 'username' => 'citrak', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB104'],
            ['name' => 'Dr. Bayu Samudra', 'username' => 'bayus', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Biokimia Dasar'],
            
            // Semester 2 - Sistem Muskuloskeletal
            ['name' => 'Dr. Linda Permata', 'username' => 'lindap', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB201'],
            ['name' => 'Dr. Rian Hidayat', 'username' => 'rianh', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB201'],
            ['name' => 'Dr. Nisa Adinda', 'username' => 'nisaa', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Sistem Muskuloskeletal'],
            
            // Semester 2 - Sistem Saraf
            ['name' => 'Dr. Kevin Pratama', 'username' => 'kevinp', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB202'],
            ['name' => 'Dr. Amelia Putri', 'username' => 'ameliap', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB202'],
            ['name' => 'Dr. Fajar Raharjo', 'username' => 'fajarr', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Sistem Saraf'],
            
            // Semester 2 - Sistem Kardiovaskular
            ['name' => 'Dr. Sinta Melati', 'username' => 'sintam', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB203'],
            ['name' => 'Dr. Rio Kusuma', 'username' => 'riok', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB203'],
            ['name' => 'Dr. Tania Anggraini', 'username' => 'taniaa', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Sistem Kardiovaskular'],
            
            // Semester 2 - Sistem Pernafasan
            ['name' => 'Dr. Wisnu Wardhana', 'username' => 'wisnuw', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB204'],
            ['name' => 'Dr. Zahra Putri', 'username' => 'zahrap', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB204'],
            ['name' => 'Dr. Yoga Prasetya', 'username' => 'yogap', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Sistem Pernafasan'],
            
            // Semester 3 - Sistem Pencernaan
            ['name' => 'Dr. Elsa Wijayanti', 'username' => 'elsaw', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB301'],
            ['name' => 'Dr. Cahyo Nugroho', 'username' => 'cahyon', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB301'],
            ['name' => 'Dr. Gina Fitriana', 'username' => 'ginaf', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Sistem Pencernaan'],
            
            // Semester 3 - Sistem Endokrin
            ['name' => 'Dr. Hadi Prabowo', 'username' => 'hadip', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB302'],
            ['name' => 'Dr. Ira Rahmawati', 'username' => 'irar', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB302'],
            ['name' => 'Dr. Joni Setiawan', 'username' => 'jonis', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Sistem Endokrin'],
            
            // Semester 3 - Sistem Reproduksi
            ['name' => 'Dr. Karla Wijaya', 'username' => 'karlaw', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB303'],
            ['name' => 'Dr. Lukman Hakim', 'username' => 'lukmanh', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB303'],
            ['name' => 'Dr. Mira Novita', 'username' => 'miran', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Sistem Reproduksi'],
            
            // Semester 3 - Sistem Urinaria
            ['name' => 'Dr. Naufal Azizi', 'username' => 'naufala', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB304'],
            ['name' => 'Dr. Olga Safitri', 'username' => 'olgas', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB304'],
            ['name' => 'Dr. Putra Ramadhan', 'username' => 'putrar', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Sistem Urinaria'],
            
            // Semester 4 - Sistem Imun
            ['name' => 'Dr. Qonita Zahra', 'username' => 'qonitaz', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB401'],
            ['name' => 'Dr. Rizky Maulana', 'username' => 'rizkym', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB401'],
            ['name' => 'Dr. Septi Nuraini', 'username' => 'septin', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Sistem Imun'],
            
            // Semester 4 - Sistem Hematologi
            ['name' => 'Dr. Tony Gunawan', 'username' => 'tonyg', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB402'],
            ['name' => 'Dr. Umi Farida', 'username' => 'umif', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB402'],
            ['name' => 'Dr. Vicky Andriyani', 'username' => 'vickya', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Sistem Hematologi'],
            
            // Semester 4 - Kulit dan Jaringan Subkutan
            ['name' => 'Dr. Wahyu Nugraha', 'username' => 'wahyun', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB403'],
            ['name' => 'Dr. Xena Putri', 'username' => 'xenap', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB403'],
            ['name' => 'Dr. Yudi Santoso', 'username' => 'yudis', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Kulit dan Jaringan Subkutan'],
            
            // Semester 4 - Metabolisme Tubuh
            ['name' => 'Dr. Zaskia Aprilia', 'username' => 'zaskiaa', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB404'],
            ['name' => 'Dr. Aldebaran Wijaya', 'username' => 'aldebaranw', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB404'],
            ['name' => 'Dr. Bianca Putri', 'username' => 'biancap', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Metabolisme Tubuh'],
            
            // Semester 5 - Infeksi dan Imunologi
            ['name' => 'Dr. Calvin Susanto', 'username' => 'calvins', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB501'],
            ['name' => 'Dr. Diana Wulandari', 'username' => 'dianaw', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB501'],
            ['name' => 'Dr. Erik Sanjaya', 'username' => 'eriks', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Infeksi dan Imunologi'],
            
            // Semester 5 - Farmakologi Dasar
            ['name' => 'Dr. Fani Lestari', 'username' => 'fanil', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB502'],
            ['name' => 'Dr. Guntur Pratama', 'username' => 'gunturp', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB502'],
            ['name' => 'Dr. Helena Sari', 'username' => 'helenas', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Farmakologi Dasar'],
            
            // Semester 5 - Patologi Anatomi
            ['name' => 'Dr. Indra Wijaya', 'username' => 'indraw', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB503'],
            ['name' => 'Dr. Jelita Anggraini', 'username' => 'jelitaa', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB503'],
            ['name' => 'Dr. Krisna Bayu', 'username' => 'krisnab', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Patologi Anatomi'],
            
            // Semester 5 - Patologi Klinik
            ['name' => 'Dr. Lestari Dewi', 'username' => 'lestarid', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB504'],
            ['name' => 'Dr. Mario Renaldi', 'username' => 'marior', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB504'],
            ['name' => 'Dr. Nita Puspita', 'username' => 'nitap', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Patologi Klinik'],
            
            // Semester 6 - Penyakit Dalam
            ['name' => 'Dr. Oscar Wijaya', 'username' => 'oscarw', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB601'],
            ['name' => 'Dr. Putri Cahaya', 'username' => 'putric', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB601'],
            ['name' => 'Dr. Rizal Ramadhan', 'username' => 'rizalr', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Penyakit Dalam'],
            
            // Semester 6 - Bedah Dasar
            ['name' => 'Dr. Syifa Fauziah', 'username' => 'syifaf', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB602'],
            ['name' => 'Dr. Tania Permata', 'username' => 'taniap', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB602'],
            ['name' => 'Dr. Vicky Sanjaya', 'username' => 'vickys', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Bedah Dasar'],
            
            // Semester 6 - Ilmu Anak
            ['name' => 'Dr. Windy Amalia', 'username' => 'windya', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB603'],
            ['name' => 'Dr. Xaverius Pratama', 'username' => 'xaveriusp', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB603'],
            ['name' => 'Dr. Yolanda Dewi', 'username' => 'yolandad', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Ilmu Anak'],
            
            // Semester 6 - Ilmu Kebidanan
            ['name' => 'Dr. Zidan Kurniawan', 'username' => 'zidank', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB604'],
            ['name' => 'Dr. Aldi Firmansyah', 'username' => 'aldifirmansyah', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB604'],
            ['name' => 'Dr. Bella Kartika', 'username' => 'bellakartika', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Ilmu Kebidanan'],
            
            // Semester 7 - Psikiatri Dasar
            ['name' => 'Dr. Candra Wijaya', 'username' => 'candrawijaya', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB701'],
            ['name' => 'Dr. Dila Ramadhani', 'username' => 'dilaramadhani', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB701'],
            ['name' => 'Dr. Eka Purnama', 'username' => 'ekapurnama', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Psikiatri Dasar'],
            
            // Semester 7 - Ilmu Kesehatan Masyarakat
            ['name' => 'Dr. Farid Setiawan', 'username' => 'faridsetiawan', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB702'],
            ['name' => 'Dr. Gina Permata', 'username' => 'ginapermata', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB702'],
            ['name' => 'Dr. Hendra Kurnia', 'username' => 'hendrakurnia', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Ilmu Kesehatan Masyarakat'],
            
            // Semester 7 - Dermatologi
            ['name' => 'Dr. Intan Sari', 'username' => 'intansari', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB703'],
            ['name' => 'Dr. Jihan Maharani', 'username' => 'jihanmaharani', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB703'],
            ['name' => 'Dr. Krisna Bayu', 'username' => 'krisnabayu', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Dermatologi'],
            
            // Semester 7 - Ilmu Penyakit Mata
            ['name' => 'Dr. Laila Nurjannah', 'username' => 'lailanurjannah', 'peran_utama' => 'ketua', 'matkul_ketua_id' => 'MKB704'],
            ['name' => 'Dr. Muhammad Iqbal', 'username' => 'muhammadiqbal', 'peran_utama' => 'anggota', 'matkul_anggota_id' => 'MKB704'],
            ['name' => 'Dr. Nadia Fitriani', 'username' => 'nadiafitriani', 'peran_utama' => 'dosen_mengajar', 'peran_kurikulum_mengajar' => 'Ilmu Penyakit Mata'],
            
            // Dosen Standby
            ['name' => 'Dr. Standby Satu', 'username' => 'standby1', 'keahlian' => json_encode(['standby'])],
            ['name' => 'Dr. Standby Dua', 'username' => 'standby2', 'keahlian' => json_encode(['standby'])],
            ['name' => 'Dr. Standby Tiga', 'username' => 'standby3', 'keahlian' => json_encode(['standby'])],
        ];

        // Pastikan MK001 ada sebelum insert dosen dengan matkul_ketua_id = MK001
        if (!MataKuliah::where('kode', 'MK001')->exists()) {
            MataKuliah::create([
                'kode' => 'MK001',
                'nama' => 'Dummy Matkul A',
                'semester' => 1,
                'periode' => 'Ganjil',
                'jenis' => 'Blok',
                'kurikulum' => 2024,
                'tanggal_mulai' => now(),
                'tanggal_akhir' => now()->addWeeks(4),
                'blok' => 1,
                'durasi_minggu' => 4,
                'peran_dalam_kurikulum' => json_encode(['Tutor PBL', 'Koordinator Praktikum']),
            ]);
        }

        // List kompetensi untuk randomisasi
        $listKompetensi = [
            'Klinik', 'Penelitian', 'Pengajaran', 'Riset', 'Laboratorium', 'Konsultasi', 'Manajemen', 'Statistik',
            'Epidemiologi', 'Kesehatan Masyarakat', 'Promosi Kesehatan', 'Pendidikan', 'Bedah', 'Farmasi',
            'Radiologi', 'Patologi', 'Gizi', 'Nutrisi', 'Forensik', 'Psikiatri', 'Pediatri', 'Kardiologi',
            'Neurologi', 'Parasitologi', 'Imunologi'
        ];
        // List keahlian dan peran dalam kurikulum untuk randomisasi
        $listKeahlian = [
            'Kardiologi', 'Anatomi', 'Biostatistik', 'Patologi', 'Farmakologi', 'Mikrobiologi', 'Fisiologi',
            'Parasitologi', 'Histologi', 'Epidemiologi', 'Imunologi', 'Gizi Klinik', 'Kesehatan Masyarakat',
            'Kedokteran Forensik', 'Radiologi', 'Neurologi', 'Pulmonologi', 'Gastroenterologi', 'Hematologi',
            'Pendidikan', 'Bedah', 'Riset', 'Laboratorium', 'Konsultasi Obat', 'Bakteriologi', 'Olahraga',
            'Infeksi', 'Mikroskopi', 'Statistik', 'Alergi', 'Nutrisi', 'Promosi Kesehatan', 'Hukum Medis',
            'CT Scan', 'EKG', 'EEG', 'Spirometri', 'Endoskopi', 'Transfusi Darah', 'Pencegahan Penyakit',
            'Konsultasi Jantung', 'Konsultasi Saraf', 'Sistem Pernapasan', 'Sistem Pencernaan', 'Penyakit Darah',
            'Pengabdian Masyarakat', 'Konsultasi Gizi', 'Etika Medis', 'Pencitraan Medis', 'Pengajaran',
        ];
        $listPeranKurikulum = [
            'Tutor PBL Blok Sistem Kardiovaskular', 'Koordinator Modul Anatomi', 'Pembimbing Skripsi',
            'Tutor PBL Blok Sistem Respirasi', 'Koordinator Modul Farmakologi', 'Koordinator Modul Fisiologi',
            'Tutor PBL Blok Sistem Pencernaan', 'Koordinator Modul Histologi', 'Penguji Seminar Proposal',
            'Dosen Pembimbing Akademik', 'Kepala Laboratorium', 'Anggota Tim Penyusun Kurikulum',
            'Reviewer Jurnal Ilmiah', 'Narasumber Workshop', 'Pengajar Mata Kuliah Pilihan',
            'Pembimbing KKN/Praktik Lapangan', 'Koordinator Penelitian Prodi', 'Pengelola Website Jurusan',
            'Koordinator Ujian OSCE', 'Pembimbing Praktikum Klinik', 'Anggota Komite Etik Penelitian',
            'Koordinator Program Keterampilan Medis', 'Pembimbing Tesis Magister',
            'Koordinator Praktikum Patologi Anatomi', 'Koordinator Praktikum Ilmu Anak',
            'Koordinator Praktikum Ilmu Penyakit Mata', 'Koordinator Praktikum Dermatologi',
            'Koordinator Praktikum Ilmu Kebidanan', 'Koordinator Praktikum Psikiatri Dasar',
            'Koordinator Praktikum Penyakit Dalam', 'Pengampu Ilmu Kesehatan Masyarakat',
            'Pengampu Ilmu Kebidanan', 'Pengampu Penyakit Dalam', 'Pengampu Psikiatri Dasar',
            'Pengampu Farmakologi Dasar', 'Pengampu Infeksi dan Imunologi',
        ];
        // Mapping keahlian berdasarkan kode mata kuliah untuk perfect match
        $keahlianMapping = [
            'MKB101' => ['Anatomi', 'Fisiologi', 'Biokimia Dasar'],
            'MKB102' => ['Anatomi', 'Histologi', 'Mikroskopi'],
            'MKB103' => ['Fisiologi', 'Biokimia', 'Sistem Tubuh'],
            'MKB104' => ['Biokimia', 'Metabolisme', 'Enzim'],
            'MKB201' => ['Anatomi', 'Bedah', 'Radiologi'],
            'MKB202' => ['Neurologi', 'Anatomi', 'Fisiologi'],
            'MKB203' => ['Kardiologi', 'Fisiologi', 'EKG'],
            'MKB204' => ['Pulmonologi', 'Fisiologi', 'Spirometri'],
            'MKB301' => ['Gastroenterologi', 'Fisiologi', 'Endoskopi'],
            'MKB302' => ['Endokrinologi', 'Fisiologi', 'Metabolisme'],
            'MKB303' => ['Ginekologi', 'Anatomi', 'Fisiologi'],
            'MKB304' => ['Nefrologi', 'Fisiologi', 'Anatomi'],
            'MKB401' => ['Imunologi', 'Mikrobiologi', 'Infeksi'],
            'MKB402' => ['Hematologi', 'Patologi', 'Transfusi Darah'],
            'MKB403' => ['Dermatologi', 'Anatomi', 'Patologi'],
            'MKB404' => ['Biokimia', 'Endokrinologi', 'Nutrisi'],
            'MKB501' => ['Infeksi', 'Imunologi', 'Mikrobiologi'],
            'MKB502' => ['Farmakologi', 'Farmasi', 'Konsultasi Obat'],
            'MKB503' => ['Patologi', 'Anatomi', 'Mikroskopi'],
            'MKB504' => ['Patologi', 'Laboratorium', 'Diagnostik'],
            'MKB601' => ['Penyakit Dalam', 'Diagnostik', 'Konsultasi'],
            'MKB602' => ['Bedah', 'Anatomi', 'Radiologi'],
            'MKB603' => ['Pediatri', 'Penyakit Dalam', 'Nutrisi'],
            'MKB604' => ['Ginekologi', 'Kebidanan', 'Anatomi'],
            'MKB701' => ['Psikiatri', 'Konsultasi', 'Pengajaran'],
            'MKB702' => ['Kesehatan Masyarakat', 'Epidemiologi', 'Promosi Kesehatan'],
            'MKB703' => ['Dermatologi', 'Anatomi', 'Patologi'],
            'MKB704' => ['Oftalmologi', 'Anatomi', 'Radiologi'],
        ];

        // Saat membangun $dosenData, assign keahlian sesuai mata kuliah (kecuali standby)
        foreach ($dosenData as &$dosen) {
            if (isset($dosen['keahlian']) && is_array(json_decode($dosen['keahlian'], true)) && in_array('standby', json_decode($dosen['keahlian'], true))) {
                $dosen['keahlian'] = json_encode(['standby']);
                $dosen['peran_dalam_kurikulum'] = json_encode([]);
                $dosen['kompetensi'] = null;
            } else {
                // Random 2-3 kompetensi
                $randKompetensi = collect($listKompetensi)->shuffle()->take(rand(2,3))->values()->toArray();
                $dosen['kompetensi'] = json_encode($randKompetensi);
                
                // Assign keahlian sesuai mata kuliah
                $matkulKode = null;
                if (isset($dosen['matkul_ketua_id'])) {
                    $matkulKode = $dosen['matkul_ketua_id'];
                } elseif (isset($dosen['matkul_anggota_id'])) {
                    $matkulKode = $dosen['matkul_anggota_id'];
                }
                
                if ($matkulKode && isset($keahlianMapping[$matkulKode])) {
                    $dosen['keahlian'] = json_encode($keahlianMapping[$matkulKode]);
                } else {
                    // Fallback ke random keahlian jika tidak ada mapping
                $randKeahlian = collect($listKeahlian)->shuffle()->take(rand(2,3))->values()->toArray();
                $dosen['keahlian'] = json_encode($randKeahlian);
                }
                
                // Random 2-3 peran kurikulum
                $randPeran = collect($listPeranKurikulum)->shuffle()->take(rand(2,3))->values()->toArray();
                $dosen['peran_dalam_kurikulum'] = json_encode($randPeran);
            }
        }
        unset($dosen); // break reference

        // Insert ke DB dengan field yang benar
        foreach ($dosenData as $dosen) {
            // Pastikan semua field ada
            User::updateOrCreate(
                ['username' => $dosen['username']],
                [
                    'name' => $dosen['name'],
                    'username' => $dosen['username'],
                    'nid' => $dosen['nid'] ?? '1980' . rand(10000, 99999),
                    'nidn' => $dosen['nidn'] ?? '00' . rand(10000000, 99999999),
                    'email' => $dosen['username'] . '@umj.ac.id',
                    'telp' => $dosen['telp'] ?? '08' . rand(100000000, 999999999),
                    'role' => 'dosen',
                    'password' => Hash::make('password'),
                    'peran_utama' => $dosen['peran_utama'] ?? null,
                    'matkul_ketua_id' => $dosen['matkul_ketua_id'] ?? null,
                    'matkul_anggota_id' => $dosen['matkul_anggota_id'] ?? null,
                    'peran_kurikulum_mengajar' => $dosen['peran_kurikulum_mengajar'] ?? null,
                    'kompetensi' => $dosen['kompetensi'] ?? null,
                    'keahlian' => $dosen['keahlian'] ?? null,
                    'peran_kurikulum' => $dosen['peran_dalam_kurikulum'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        User::insert([
            // Super Admin
            [
                'nip' => null,
                'nid' => null,
                'nidn' => null,
                'nim' => null,
                'gender' => null,
                'ipk' => null,
                'status' => null,
                'angkatan' => null,
                'name' => 'Super Admin',
                'username' => 'superadmin',
                'email' => 'superadmin@umj.ac.id',
                'telp' => null,
                'ket' => null,
                'role' => 'super_admin',
                'password' => Hash::make('password'),
                'kompetensi' => null,
                'keahlian' => null,
                'is_logged_in' => false,
                'current_token' => null,
                'semester' => null,
            ],
            // Tim Akademik (4)
            [
                'nip' => '1978123456', 'nid' => null, 'nidn' => null, 'nim' => null, 'gender' => null, 'ipk' => null, 'status' => null, 'angkatan' => null,
                'name' => 'Andi Pratama', 'username' => 'andipratama', 'email' => 'andi@umj.ac.id', 'telp' => '081234567810', 'ket' => 'Ketua Tim', 'role' => 'tim_akademik', 'password' => Hash::make('password'),
                'kompetensi' => null,
                'keahlian' => null,
                'is_logged_in' => false,
                'current_token' => null,
                'semester' => null,
            ],
            [
                'nip' => '1978123457', 'nid' => null, 'nidn' => null, 'nim' => null, 'gender' => null, 'ipk' => null, 'status' => null, 'angkatan' => null,
                'name' => 'Sari Dewi', 'username' => 'saridewi', 'email' => 'sari@umj.ac.id', 'telp' => '081234567811', 'ket' => 'Sekretaris', 'role' => 'tim_akademik', 'password' => Hash::make('password'),
                'kompetensi' => null,
                'keahlian' => null,
                'is_logged_in' => false,
                'current_token' => null,
                'semester' => null,
            ],
            [
                'nip' => '1978123458', 'nid' => null, 'nidn' => null, 'nim' => null, 'gender' => null, 'ipk' => null, 'status' => null, 'angkatan' => null,
                'name' => 'Bambang Irawan', 'username' => 'bambangirawan', 'email' => 'bambang@umj.ac.id', 'telp' => '081234567812', 'ket' => 'Anggota', 'role' => 'tim_akademik', 'password' => Hash::make('password'),
                'kompetensi' => null,
                'keahlian' => null,
                'is_logged_in' => false,
                'current_token' => null,
                'semester' => null,
            ],
            [
                'nip' => '1978123459', 'nid' => null, 'nidn' => null, 'nim' => null, 'gender' => null, 'ipk' => null, 'status' => null, 'angkatan' => null,
                'name' => 'Dewi Lestari', 'username' => 'dewilestari', 'email' => 'dewi@umj.ac.id', 'telp' => '081234567813', 'ket' => 'Anggota', 'role' => 'tim_akademik', 'password' => Hash::make('password'),
                'kompetensi' => null,
                'keahlian' => null,
                'is_logged_in' => false,
                'current_token' => null,
                'semester' => null,
            ],
            // Mahasiswa (100)
            ...array_map(function($data, $i) {
                // Generate angkatan yang bervariasi (2020-2024)
                $angkatanList = ['2020', '2021', '2022', '2023', '2024'];
                $selectedAngkatan = $angkatanList[$i % count($angkatanList)];
                
                // Generate status yang realistis
                $statusOptions = ['aktif', 'aktif', 'aktif', 'aktif', 'aktif', 'aktif', 'cuti', 'lulus'];
                $selectedStatus = $statusOptions[$i % count($statusOptions)];
                
                // Generate IPK yang realistis (2.50 - 4.00)
                $ipkBase = 2.50 + (($i * 17) % 150) / 100; // Generates values between 2.50-4.00
                $ipk = round($ipkBase, 2);
                if ($ipk > 4.00) $ipk = 4.00;
                
                return [
                    'nip' => null,
                    'nid' => null,
                    'nidn' => null,
                    'nim' => $selectedAngkatan . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                    'gender' => ($i + 1) % 2 === 0 ? 'Laki-laki' : 'Perempuan',
                    'ipk' => $ipk,
                    'status' => $selectedStatus,
                    'angkatan' => $selectedAngkatan,
                    'name' => $data['name'],
                    'username' => $data['username'],
                    'email' => $data['username'] . '@umj.ac.id',
                    'telp' => '0812345679' . str_pad($i + 1, 2, '0', STR_PAD_LEFT),
                    'ket' => null,
                    'role' => 'mahasiswa',
                    'password' => Hash::make('password'),
                    'kompetensi' => null,
                    'keahlian' => null,
                    'is_logged_in' => false,
                    'current_token' => null,
                    'semester' => $data['semester'] ?? null,
                ];
            }, $mahasiswaData, array_keys($mahasiswaData)),
        ]);
    }
}