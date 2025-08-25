<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('mata_kuliah', function (Blueprint $table) {
            // Hapus kolom 'materi' jika ada
            if (Schema::hasColumn('mata_kuliah', 'materi')) {
                $table->dropColumn('materi');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mata_kuliah', function (Blueprint $table) {
            // Tambahkan kembali kolom 'materi' jika rollback
            $table->json('materi')->nullable();
        });
    }
};
