<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // Drop old unique indexes if they exist
            if (Schema::hasIndex('users', 'users_email_unique')) {
                $table->dropUnique('users_email_unique');
            }
            if (Schema::hasIndex('users', 'users_username_unique')) {
                $table->dropUnique('users_username_unique');
            }
            // Drop new unique indexes if they already exist
            if (Schema::hasIndex('users', 'users_email_role_unique')) {
                $table->dropUnique(['email', 'role']);
            }
            if (Schema::hasIndex('users', 'users_username_role_unique')) {
                $table->dropUnique(['username', 'role']);
            }
            // Add new unique indexes for (email, role) and (username, role)
            $table->unique(['email', 'role']);
            $table->unique(['username', 'role']);
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['email', 'role']);
            $table->dropUnique(['username', 'role']);
            $table->unique('email');
            $table->unique('username');
        });
    }
}; 