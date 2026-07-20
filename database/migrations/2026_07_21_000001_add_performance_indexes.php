<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // sales: every report filters status + date range together
        Schema::table('sales', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'sales_status_created_at_idx');
        });

        // products: active flag filtered on almost every product query
        Schema::table('products', function (Blueprint $table) {
            $table->index('active', 'products_active_idx');
            $table->index(['active', 'category_id'], 'products_active_category_idx');
            $table->index('expiry_date', 'products_expiry_date_idx');
            $table->fullText(['name', 'name_si'], 'products_name_fulltext');
        });

        // stock_movements: high-volume table, product history always filters by date
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->index(['product_id', 'created_at'], 'stock_movements_product_created_idx');
        });

        // customers: credit report orders by credit_balance desc
        Schema::table('customers', function (Blueprint $table) {
            $table->index('credit_balance', 'customers_credit_balance_idx');
        });

        // credit_payments: customer payment history filtered by date
        Schema::table('credit_payments', function (Blueprint $table) {
            $table->index(['customer_id', 'created_at'], 'credit_payments_customer_created_idx');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropIndex('sales_status_created_at_idx');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_active_idx');
            $table->dropIndex('products_active_category_idx');
            $table->dropIndex('products_expiry_date_idx');
            $table->dropFullText('products_name_fulltext');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropIndex('stock_movements_product_created_idx');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex('customers_credit_balance_idx');
        });

        Schema::table('credit_payments', function (Blueprint $table) {
            $table->dropIndex('credit_payments_customer_created_idx');
        });
    }
};
