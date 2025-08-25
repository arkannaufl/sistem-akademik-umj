<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB; // Added this import for DB facade

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, we need to drop the enum constraint and recreate it with the new value
        // This is a MySQL-specific approach
        DB::statement("ALTER TABLE dosen_peran MODIFY COLUMN tipe_peran ENUM('koordinator', 'tim_blok', 'dosen_mengajar') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove the 'dosen_mengajar' value
        DB::statement("ALTER TABLE dosen_peran MODIFY COLUMN tipe_peran ENUM('koordinator', 'tim_blok') NOT NULL");
    }
};
