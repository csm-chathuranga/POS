<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 0. Convert ALL tables to InnoDB so foreign keys work
        foreach (DB::select('SHOW TABLES') as $t) {
            $name = array_values((array) $t)[0];
            $info = DB::select('SHOW TABLE STATUS WHERE Name = ?', [$name]);
            if (isset($info[0]) && $info[0]->Engine !== 'InnoDB') {
                DB::statement('ALTER TABLE `' . $name . '` ENGINE=InnoDB');
            }
        }

        // 1. Drop Spatie tables if they exist (safe to ignore if already gone)
        Schema::dropIfExists('role_has_permissions');
        Schema::dropIfExists('model_has_permissions');
        Schema::dropIfExists('model_has_roles');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');

        // 2. Create clean roles table
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('display_name')->nullable();
            $table->timestamps();
        });

        // 3. Seed the three roles
        DB::table('roles')->insert([
            ['name' => 'admin',   'display_name' => 'Admin',   'created_at' => now(), 'updated_at' => now()],
            ['name' => 'manager', 'display_name' => 'Manager', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'cashier', 'display_name' => 'Cashier', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // 4. Create pivot table (foreign keys work now that engine = InnoDB)
        Schema::dropIfExists('user_role');
        Schema::create('user_role', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->primary(['user_id', 'role_id']);
        });

        // 5. Migrate existing role data → user_role
        //    Source priority: user_type column (if exists) → default cashier
        $roles   = DB::table('roles')->pluck('id', 'name');
        $columns = array_column(DB::select('SHOW COLUMNS FROM users'), 'Field');
        $hasUserType = in_array('user_type', $columns);

        foreach (DB::table('users')->get() as $user) {
            $type = 'cashier';
            if ($hasUserType && !empty($user->user_type)) {
                $type = $user->user_type;
            }
            DB::table('user_role')->insertOrIgnore([
                'user_id' => $user->id,
                'role_id' => $roles[$type] ?? $roles['cashier'],
            ]);
        }

        // 6. Drop user_type column if it exists
        if ($hasUserType) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('user_type');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_role');
        Schema::dropIfExists('roles');

        Schema::table('users', function (Blueprint $table) {
            $table->enum('user_type', ['admin', 'manager', 'cashier'])
                  ->default('cashier')
                  ->after('email');
        });
    }
};
