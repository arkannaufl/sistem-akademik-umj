<?php

namespace Database\Seeders;

use App\Models\MataKuliah;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Activitylog\Models\Activity;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Nonaktifkan logging Spatie selama seeding
        activity()->disableLogging();

        $this->call([
            MataKuliahSeeder::class,
            UserSeeder::class,
            RuanganSeeder::class,
            TahunAjaranSeeder::class,
            CSRSeeder::class,
            MataKuliahKeahlianSeeder::class,
        ]);

        // Aktifkan lagi logging Spatie
        activity()->enableLogging();
    }
}
