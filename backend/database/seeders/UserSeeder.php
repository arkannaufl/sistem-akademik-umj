<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

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

        // Data dosen dengan nama yang realistis
        $dosenData = [
            ['name' => 'Dr. Andika Putra Wijaya', 'username' => 'andikaw'],
            ['name' => 'Dr. Sari Indah Sari', 'username' => 'sariindah'],
            ['name' => 'Dr. Bambang Tri Hartono', 'username' => 'bambanghartono'],
            ['name' => 'Dr. Dewi Ratna Sari', 'username' => 'dewiratna'],
            ['name' => 'Dr. Eko Budi Santoso', 'username' => 'ekobudi'],
            ['name' => 'Dr. Fitria Maharani', 'username' => 'fitriamaharani'],
            ['name' => 'Dr. Gunawan Setiadi', 'username' => 'gunawansetiadi'],
            ['name' => 'Dr. Hesti Kumalasari', 'username' => 'hestikumala'],
            ['name' => 'Dr. Irfan Maulana', 'username' => 'irfanmaulana'],
            ['name' => 'Dr. Joko Widodo Pranoto', 'username' => 'jokowidodo'],
            // Tambahan dosen untuk distribusi kompetensi
            ['name' => 'Prof. Dr. Citra Kirana', 'username' => 'citrak'],
            ['name' => 'Dr. Bayu Samudra', 'username' => 'bayus'],
            ['name' => 'Dr. Linda Permata', 'username' => 'lindap'],
            ['name' => 'Dr. Rian Hidayat', 'username' => 'rianh'],
            ['name' => 'Dr. Nisa Adinda', 'username' => 'nisaa'],
            ['name' => 'Dr. Kevin Pratama', 'username' => 'kevinp'],
            ['name' => 'Dr. Amelia Putri', 'username' => 'ameliap'],
            ['name' => 'Dr. Fajar Raharjo', 'username' => 'fajarr'],
            ['name' => 'Dr. Sinta Melati', 'username' => 'sintam'],
            ['name' => 'Dr. Rio Kusuma', 'username' => 'riok'],
            ['name' => 'Dr. Tania Anggraini', 'username' => 'taniaa'],
            ['name' => 'Dr. Wisnu Wardhana', 'username' => 'wisnuw'],
            ['name' => 'Dr. Zahra Putri', 'username' => 'zahrap'],
            ['name' => 'Dr. Yoga Prasetya', 'username' => 'yogap'],
            ['name' => 'Dr. Elsa Wijayanti', 'username' => 'elsaw'],
            ['name' => 'Dr. Cahyo Nugroho', 'username' => 'cahyon'],
            ['name' => 'Dr. Gina Fitriana', 'username' => 'ginaf'],
            ['name' => 'Dr. Hadi Prabowo', 'username' => 'hadip'],
            ['name' => 'Dr. Ira Rahmawati', 'username' => 'irar'],
            ['name' => 'Dr. Joni Setiawan', 'username' => 'jonis'],
            ['name' => 'Dr. Karla Wijaya', 'username' => 'karlaw'],
            ['name' => 'Dr. Lukman Hakim', 'username' => 'lukmanh'],
            ['name' => 'Dr. Mira Novita', 'username' => 'miran'],
            ['name' => 'Dr. Naufal Azizi', 'username' => 'naufala'],
            ['name' => 'Dr. Olga Safitri', 'username' => 'olgas'],
            ['name' => 'Dr. Putra Ramadhan', 'username' => 'putrar'],
            ['name' => 'Dr. Qonita Zahra', 'username' => 'qonitaz'],
            ['name' => 'Dr. Rizky Maulana', 'username' => 'rizkym'],
            ['name' => 'Dr. Septi Nuraini', 'username' => 'septin'],
            ['name' => 'Dr. Tony Gunawan', 'username' => 'tonyg'],
            ['name' => 'Dr. Umi Farida', 'username' => 'umif'],
            ['name' => 'Dr. Vicky Andriyani', 'username' => 'vickya'],
            ['name' => 'Dr. Wahyu Nugraha', 'username' => 'wahyun'],
            ['name' => 'Dr. Xena Putri', 'username' => 'xenap'],
            ['name' => 'Dr. Yudi Santoso', 'username' => 'yudis'],
            ['name' => 'Dr. Zaskia Aprilia', 'username' => 'zaskiaa'],
            ['name' => 'Dr. Aldebaran Wijaya', 'username' => 'aldebaranw'],
            ['name' => 'Dr. Bianca Putri', 'username' => 'biancap'],
            ['name' => 'Dr. Calvin Susanto', 'username' => 'calvins'],
            ['name' => 'Dr. Diana Wulandari', 'username' => 'dianaw'],
            ['name' => 'Dr. Erik Sanjaya', 'username' => 'eriks'],
            ['name' => 'Dr. Fani Lestari', 'username' => 'fanil'],
            ['name' => 'Dr. Guntur Pratama', 'username' => 'gunturp'],
            ['name' => 'Dr. Helena Sari', 'username' => 'helenas'],
            ['name' => 'Dr. Indra Wijaya', 'username' => 'indraw'],
            ['name' => 'Dr. Jelita Anggraini', 'username' => 'jelitaa'],
            ['name' => 'Dr. Krisna Bayu', 'username' => 'krisnab'],
            ['name' => 'Dr. Lestari Dewi', 'username' => 'lestarid'],
            ['name' => 'Dr. Mario Renaldi', 'username' => 'marior'],
            ['name' => 'Dr. Nita Puspita', 'username' => 'nitap'],
            ['name' => 'Dr. Oscar Wijaya', 'username' => 'oscarw'],
            ['name' => 'Dr. Putri Cahaya', 'username' => 'putric'],
            ['name' => 'Dr. Rizal Ramadhan', 'username' => 'rizalr'],
            ['name' => 'Dr. Syifa Fauziah', 'username' => 'syifaf'],
            ['name' => 'Dr. Tania Permata', 'username' => 'taniap'],
            ['name' => 'Dr. Vicky Sanjaya', 'username' => 'vickys'],
            ['name' => 'Dr. Windy Amalia', 'username' => 'windya'],
            ['name' => 'Dr. Xaverius Pratama', 'username' => 'xaveriusp'],
            ['name' => 'Dr. Yolanda Dewi', 'username' => 'yolandad'],
            ['name' => 'Dr. Zidan Kurniawan', 'username' => 'zidank'],
            // Dosen Standby
            ['name' => 'Dr. Standby Satu', 'username' => 'standby1', 'keahlian' => json_encode(['standby'])],
            ['name' => 'Dr. Standby Dua', 'username' => 'standby2', 'keahlian' => json_encode(['standby'])],
            ['name' => 'Dr. Standby Tiga', 'username' => 'standby3', 'keahlian' => json_encode(['standby'])],
        ];

        // Ambil semua keahlian_required unik dari PBL
        $allKeahlian = [];
        foreach (\App\Models\PBL::all() as $pbl) {
            if (is_array($pbl->keahlian_required)) {
                $allKeahlian = array_merge($allKeahlian, $pbl->keahlian_required);
            }
        }
        $allKeahlian = array_unique($allKeahlian);
        $allKeahlian = array_values(array_filter($allKeahlian)); // Hilangkan null/kosong
        if (empty($allKeahlian)) {
            $allKeahlian = [
                'Kardiologi', 'Pendidikan', 'Anatomi', 'Bedah', 'Biostatistik', 'Epidemiologi',
                'Patologi', 'Laboratorium', 'Farmakologi', 'Konsultasi Obat', 'Mikrobiologi', 'Bakteriologi',
                'Fisiologi', 'Olahraga', 'Parasitologi', 'Infeksi', 'Histologi', 'Mikroskopi',
                'Imunologi', 'Alergi', 'Gizi Klinik', 'Nutrisi', 'Kesehatan Masyarakat', 'Promosi Kesehatan',
                'Kedokteran Forensik', 'Hukum Medis', 'Radiologi', 'CT Scan', 'EKG', 'EEG', 'Spirometri', 'Endoskopi', 'Transfusi Darah'
            ];
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
            // Dosen (67)
            ...array_map(function($data, $i) use ($allKeahlian) {
                // Contoh kompetensi dan peran kurikulum
                $kompetensiList = [
                    ['Klinik', 'Penelitian'],
                    ['Anatomi', 'Pengajaran'],
                    ['Biostatistik', 'Riset'],
                    ['Patologi', 'Pengajaran'],
                    ['Farmakologi', 'Penelitian'],
                    ['Mikrobiologi', 'Riset'],
                    ['Fisiologi', 'Pengajaran'],
                    ['Parasitologi', 'Penelitian'],
                    ['Histologi', 'Pengajaran'],
                    ['Epidemiologi', 'Riset'],
                    ['Imunologi', 'Pengabdian Masyarakat'],
                    ['Gizi Klinik', 'Konsultasi Gizi'],
                    ['Kesehatan Masyarakat', 'Pencegahan Penyakit'],
                    ['Kedokteran Forensik', 'Etika Medis'],
                    ['Radiologi', 'Pencitraan Medis'],
                    ['Kardiologi', 'Konsultasi Jantung'],
                    ['Neurologi', 'Konsultasi Saraf'],
                    ['Pulmonologi', 'Sistem Pernapasan'],
                    ['Gastroenterologi', 'Sistem Pencernaan'],
                    ['Hematologi', 'Penyakit Darah'],
                ];
                $keahlianList = [
                    ['Kardiologi', 'Pendidikan'],
                    ['Anatomi', 'Bedah'],
                    ['Biostatistik', 'Epidemiologi'],
                    ['Patologi', 'Laboratorium'],
                    ['Farmakologi', 'Konsultasi Obat'],
                    ['Mikrobiologi', 'Bakteriologi'],
                    ['Fisiologi', 'Olahraga'],
                    ['Parasitologi', 'Infeksi'],
                    ['Histologi', 'Mikroskopi'],
                    ['Epidemiologi', 'Statistik'],
                    ['Imunologi', 'Alergi'],
                    ['Gizi Klinik', 'Nutrisi'],
                    ['Kesehatan Masyarakat', 'Promosi Kesehatan'],
                    ['Kedokteran Forensik', 'Hukum Medis'],
                    ['Radiologi', 'CT Scan'],
                    ['Kardiologi', 'EKG'],
                    ['Neurologi', 'EEG'],
                    ['Pulmonologi', 'Spirometri'],
                    ['Gastroenterologi', 'Endoskopi'],
                    ['Hematologi', 'Transfusi Darah'],
                ];
                $peranList = [
                    'Tutor PBL Blok Sistem Kardiovaskular',
                    'Koordinator Modul Anatomi',
                    'Pembimbing Skripsi dan Peneliti Aktif',
                    'Tutor PBL Blok Sistem Respirasi',
                    'Koordinator Modul Farmakologi',
                    'Pembimbing Skripsi dan Peneliti Aktif',
                    'Koordinator Modul Fisiologi',
                    'Tutor PBL Blok Sistem Pencernaan',
                    'Koordinator Modul Histologi',
                    'Pembimbing Skripsi dan Peneliti Aktif',
                    'Penguji Seminar Proposal',
                    'Dosen Pembimbing Akademik',
                    'Kepala Laboratorium',
                    'Anggota Tim Penyusun Kurikulum',
                    'Reviewer Jurnal Ilmiah',
                    'Narasumber Workshop',
                    'Pengajar Mata Kuliah Pilihan',
                    'Pembimbing KKN/Praktik Lapangan',
                    'Koordinator Penelitian Prodi',
                    'Pengelola Website Jurusan',
                    'Koordinator Ujian OSCE',
                    'Pembimbing Praktikum Klinik',
                    'Anggota Komite Etik Penelitian',
                    'Koordinator Program Keterampilan Medis',
                    'Pembimbing Tesis Magister',
                ];

                // Assign 2-3 random unique roles
                shuffle($peranList);
                $numRoles = rand(2, 3);
                $assignedPeran = array_slice($peranList, 0, $numRoles);
                
                // Tambahkan keahlian standby jika ada di data
                $keahlian = isset($data['keahlian']) ? json_decode($data['keahlian'], true) : (
                    collect($allKeahlian)->shuffle()->take(rand(2,3))->values()->toArray()
                );
                // Generate NIDN yang realistis (10 digit)
                $nidn = '00' . rand(10000000, 99999999);
                
                // Generate nomor telepon yang realistis
                $telp = '08' . rand(100000000, 999999999);
                
                return [
                    'nip' => null,
                    'nid' => '1980' . str_pad($i, 4, '0', STR_PAD_LEFT),
                    'nidn' => $nidn,
                    'nim' => null,
                    'gender' => null,
                    'ipk' => null,
                    'status' => null,
                    'angkatan' => null,
                    'name' => $data['name'],
                    'username' => $data['username'],
                    'email' => $data['username'] . '@umj.ac.id',
                    'telp' => $telp,
                    'ket' => null,
                    'role' => 'dosen',
                    'password' => Hash::make('password'),
                    'kompetensi' => json_encode($kompetensiList[$i % count($kompetensiList)]),
                    'keahlian' => json_encode($keahlian),
                    'is_logged_in' => false,
                    'current_token' => null,
                    'semester' => null,
                ];
            }, $dosenData, array_keys($dosenData)),
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