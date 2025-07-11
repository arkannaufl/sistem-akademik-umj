<?php

namespace Database\Seeders;

use App\Models\MataKuliah;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            RuanganSeeder::class,
            TahunAjaranSeeder::class,
            MataKuliahSeeder::class,
            CSRSeeder::class,
        ]);
    }
}
