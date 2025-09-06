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
        Schema::table('pbl_mappings', function (Blueprint $table) {
            $table->string('role')->nullable()->after('dosen_id')->comment('Role dosen: koordinator, tim_blok, dosen_mengajar');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pbl_mappings', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
