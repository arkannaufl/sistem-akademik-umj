<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\MataKuliah;
use App\Models\PBL;

class MataKuliahSeeder extends Seeder
{
    public function run()
    {
        $startYear = 2024;
        $blokData = [];
        $nonBlokData = [];

        for ($semester = 1; $semester <= 7; $semester++) {
            $isGanjil = $semester % 2 !== 0;
            $periode = $isGanjil ? 'Ganjil' : 'Genap';

            // Awal semester (Februari untuk ganjil, Agustus untuk genap)
            $startMonth = $isGanjil ? 2 : 8;
            $startDate = \Carbon\Carbon::create($startYear, $startMonth, 19);

            // 1. Tambah 4 matakuliah Blok (berurutan, tidak overlap)
            $currentBlokStart = clone $startDate;
            for ($blok = 1; $blok <= 4; $blok++) {
                $blokEnd = (clone $currentBlokStart)->copy()->addWeeks(4)->subDay();
                $blokData[] = [
                    'kode' => 'MKB' . $semester . '0' . $blok,
                    'nama' => $this->getBlokName($semester, $blok),
                    'semester' => $semester,
                    'periode' => $periode,
                    'jenis' => 'Blok',
                    'kurikulum' => 2024,
                    'tanggal_mulai' => $currentBlokStart->format('Y-m-d'),
                    'tanggal_akhir' => $blokEnd->format('Y-m-d'),
                    'blok' => $blok,
                    'durasi_minggu' => 4,
                    'peran_dalam_kurikulum' => [
                        'Tutor PBL Blok ' . $blok,
                        'Koordinator Praktikum ' . $this->getBlokName($semester, $blok),
                        'Pengampu ' . $this->getBlokName($semester, $blok),
                    ],
                ];
                $currentBlokStart = (clone $blokEnd)->copy()->addDay();
            }

            // 2. Tambah hanya 1 matakuliah Non Blok per semester
            $nonBlokEndDate = (clone $startDate)->copy()->addWeeks(20)->subDay();
            $tipe_non_block = in_array($semester, [1, 2, 4, 7]) ? 'CSR' : 'Non-CSR';
            $nonBlokData[] = [
                'kode' => 'MKU' . str_pad($semester, 3, '0', STR_PAD_LEFT),
                'nama' => $this->getNonBlokName($semester),
                'semester' => $semester,
                'periode' => $periode,
                'jenis' => 'Non Blok',
                'kurikulum' => 2024,
                'tanggal_mulai' => $startDate->format('Y-m-d'),
                'tanggal_akhir' => $nonBlokEndDate->format('Y-m-d'),
                'blok' => null,
                'durasi_minggu' => 20,
                'tipe_non_block' => $tipe_non_block,
                'peran_dalam_kurikulum' => [
                    'Pengampu ' . $this->getNonBlokName($semester),
                    'Koordinator ' . $this->getNonBlokName($semester),
                ],
            ];

            if (!$isGanjil) {
                $startYear++;
            }
        }

        // Insert Blok dulu
        foreach ($blokData as $item) {
            $mk = MataKuliah::create($item);

            // Seeder PBL: 2-4 modul per blok, nama realistis
            $jumlahPBL = rand(2, 4);
            $topikPBL = [
                'Kasus Infeksi Saluran Pernapasan',
                'Kasus Diabetes Melitus',
                'Kasus Gagal Ginjal Kronis',
                'Kasus Hipertensi',
                'Kasus Stroke',
                'Kasus Asma Bronkial',
                'Kasus Anemia',
                'Kasus Demam Berdarah',
                'Kasus Tuberkulosis Paru',
                'Kasus Gagal Jantung',
                'Kasus Fraktur Tulang',
                'Kasus Luka Bakar',
                'Kasus Penyakit Kulit',
                'Kasus Gangguan Tiroid',
                'Kasus Penyakit Autoimun',
                'Kasus Kanker Payudara',
                'Kasus Kanker Serviks',
                'Kasus Penyakit Menular Seksual',
                'Kasus Malaria',
                'Kasus HIV/AIDS',
            ];
            shuffle($topikPBL);
            for ($i = 1; $i <= $jumlahPBL; $i++) {
                // List keahlian global (bisa diambil dari UserSeeder, disalin di sini agar konsisten)
                $globalKeahlian = [
                    'Kardiologi', 'Pendidikan', 'Anatomi', 'Bedah', 'Biostatistik', 'Epidemiologi',
                    'Patologi', 'Laboratorium', 'Farmakologi', 'Konsultasi Obat', 'Mikrobiologi', 'Bakteriologi',
                    'Fisiologi', 'Olahraga', 'Parasitologi', 'Infeksi', 'Histologi', 'Mikroskopi',
                    'Imunologi', 'Alergi', 'Gizi Klinik', 'Nutrisi', 'Kesehatan Masyarakat', 'Promosi Kesehatan',
                    'Kedokteran Forensik', 'Hukum Medis', 'Radiologi', 'CT Scan', 'EKG', 'EEG', 'Spirometri', 'Endoskopi', 'Transfusi Darah'
                ];
                shuffle($globalKeahlian);
                $keahlianRequired = array_slice($globalKeahlian, 0, rand(2,3));
                PBL::create([
                    'mata_kuliah_kode' => $mk->kode,
                    'modul_ke' => $i,
                    'nama_modul' => 'PBL ' . $i . ': ' . $topikPBL[$i - 1],
                ]);
            }
        }

        // Insert Non Blok setelahnya
        foreach ($nonBlokData as $item) {
            MataKuliah::create($item);
        }
    }

    private function getNonBlokName($semester)
    {
        $map = [
            1 => 'Pendidikan Agama Islam',
            2 => 'Pancasila',
            3 => 'Bahasa Indonesia',
            4 => 'Kewarganegaraan',
            5 => 'Bahasa Inggris Kedokteran',
            6 => 'Etika Kedokteran',
            7 => 'Metodologi Penelitian'
        ];

        return $map[$semester] ?? 'Mata Kuliah Umum';
    }

    private function getBlokName($semester, $blok)
    {
        $blokMap = [
            1 => [
                1 => 'Dasar-dasar Kedokteran',
                2 => 'Anatomi Dasar',
                3 => 'Fisiologi Dasar',
                4 => 'Biokimia Dasar',
            ],
            2 => [
                1 => 'Sistem Muskuloskeletal',
                2 => 'Sistem Saraf',
                3 => 'Sistem Kardiovaskular',
                4 => 'Sistem Pernafasan',
            ],
            3 => [
                1 => 'Sistem Pencernaan',
                2 => 'Sistem Endokrin',
                3 => 'Sistem Reproduksi',
                4 => 'Sistem Urinaria',
            ],
            4 => [
                1 => 'Sistem Imun',
                2 => 'Sistem Hematologi',
                3 => 'Kulit dan Jaringan Subkutan',
                4 => 'Metabolisme Tubuh',
            ],
            5 => [
                1 => 'Infeksi dan Imunologi',
                2 => 'Farmakologi Dasar',
                3 => 'Patologi Anatomi',
                4 => 'Patologi Klinik',
            ],
            6 => [
                1 => 'Penyakit Dalam',
                2 => 'Bedah Dasar',
                3 => 'Ilmu Anak',
                4 => 'Ilmu Kebidanan',
            ],
            7 => [
                1 => 'Psikiatri Dasar',
                2 => 'Ilmu Kesehatan Masyarakat',
                3 => 'Dermatologi',
                4 => 'Ilmu Penyakit Mata',
            ],
        ];

        return $blokMap[$semester][$blok] ?? 'Topik Blok Kedokteran';
    }
}