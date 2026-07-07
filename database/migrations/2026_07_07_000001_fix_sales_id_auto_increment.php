<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $col = DB::select("SHOW COLUMNS FROM sales WHERE Field = 'id'")[0] ?? null;

        if ($col && str_contains(strtolower($col->Extra ?? ''), 'auto_increment')) {
            return; // already correct, nothing to do
        }

        DB::statement('ALTER TABLE sales MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY');
    }

    public function down(): void
    {
        // Intentionally left empty — reverting AUTO_INCREMENT would break the table
    }
};
