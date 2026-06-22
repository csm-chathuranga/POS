<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SampleTransactionSeeder extends Seeder
{
    public function run(): void
    {
        $adminId    = DB::table('users')->where('email', 'admin@lmucpos.lk')->value('id');
        $managerId  = DB::table('users')->where('email', 'manager@lmucpos.lk')->value('id');
        $cashierId  = DB::table('users')->where('email', 'cashier@lmucpos.lk')->value('id');

        $products   = DB::table('products')->where('active', true)->get();
        $suppliers  = DB::table('suppliers')->pluck('id')->toArray();
        $customers  = DB::table('customers')->pluck('id')->toArray();

        // ── Purchases (last 30 days) ─────────────────────────────────────────
        $purchaseDefs = [
            [
                'supplier_idx' => 0,
                'days_ago'     => 28,
                'items' => [
                    ['Samba Rice',    50, 230],
                    ['Nadu Rice',     40, 215],
                    ['White Sugar',   30, 215],
                ],
            ],
            [
                'supplier_idx' => 2,
                'days_ago'     => 21,
                'items' => [
                    ['Milk Powder',   20, 2000],
                    ['Milo',         15, 1380],
                ],
            ],
            [
                'supplier_idx' => 3,
                'days_ago'     => 14,
                'items' => [
                    ['Shampoo',      30, 340],
                    ['Bath Soap',    50,  98],
                    ['Washing Powder', 25, 380],
                ],
            ],
            [
                'supplier_idx' => 4,
                'days_ago'     => 10,
                'items' => [
                    ['Cream Crackers', 60, 115],
                    ['Marie Biscuits', 60,  95],
                    ['Noodles',        40,  75],
                ],
            ],
            [
                'supplier_idx' => 5,
                'days_ago'     => 7,
                'items' => [
                    ['Ceylon Black Tea', 40, 225],
                    ['Green Tea',        20, 280],
                ],
            ],
            [
                'supplier_idx' => 1,
                'days_ago'     => 3,
                'items' => [
                    ['Red Lentils',    30, 325],
                    ['Green Gram',     25, 340],
                    ['Chickpeas',      20, 195],
                    ['Coconut Oil',    20, 690],
                ],
            ],
        ];

        $grnCounter = 1;
        foreach ($purchaseDefs as $def) {
            $supplierId   = $suppliers[$def['supplier_idx']] ?? $suppliers[0];
            $purchaseDate = Carbon::now()->subDays($def['days_ago'])->toDateString();
            $total        = 0;
            $lineItems    = [];

            foreach ($def['items'] as [$productName, $qty, $cost]) {
                $product = $products->firstWhere('name', $productName);
                if (!$product) continue;
                $lineTotal   = $qty * $cost;
                $total      += $lineTotal;
                $lineItems[] = [
                    'product_id'   => $product->id,
                    'product_name' => $product->name,
                    'cost_price'   => $cost,
                    'qty'          => $qty,
                    'total'        => $lineTotal,
                    'created_at'   => now(),
                    'updated_at'   => now(),
                ];
            }

            $grnNo = 'GRN-' . str_pad($grnCounter++, 4, '0', STR_PAD_LEFT);

            $purchaseId = DB::table('purchases')->insertGetId([
                'grn_no'        => $grnNo,
                'supplier_id'   => $supplierId,
                'user_id'       => $managerId,
                'total'         => $total,
                'paid'          => $total,
                'status'        => 'received',
                'purchase_date' => $purchaseDate,
                'note'          => null,
                'created_at'    => $purchaseDate . ' 10:00:00',
                'updated_at'    => $purchaseDate . ' 10:00:00',
            ]);

            foreach ($lineItems as $item) {
                DB::table('purchase_items')->insert(array_merge($item, ['purchase_id' => $purchaseId]));
            }
        }

        // ── Sales (last 7 days) ──────────────────────────────────────────────
        $salesDefs = [
            // [customer_idx or null, days_ago, hour, payment_method, items: [product_name, qty]]
            [null,  6, 9,  'cash',   [['Samba Rice', 2], ['Red Lentils', 1], ['Coconut Oil', 1]]],
            [0,     6, 11, 'cash',   [['White Sugar', 2], ['Ceylon Black Tea', 1], ['Bath Soap', 2]]],
            [null,  6, 14, 'cash',   [['Noodles', 3], ['Cream Crackers', 2], ['Marie Biscuits', 2]]],
            [1,     5, 10, 'credit', [['Milk Powder', 1], ['Milo', 1]]],
            [null,  5, 12, 'cash',   [['Eggs', 2], ['Fresh Milk', 3], ['Bread', 2]]],
            [2,     5, 15, 'card',   [['Coconut Oil', 2], ['Washing Powder', 1], ['Shampoo', 1]]],
            [null,  4, 9,  'cash',   [['Samba Rice', 5], ['Nadu Rice', 3], ['White Sugar', 3]]],
            [3,     4, 13, 'cash',   [['Canned Mackerel', 3], ['Canned Tuna', 2], ['Tomato Sauce', 2]]],
            [null,  4, 17, 'cash',   [['Potato Chips', 4], ['Chocolate Biscuits', 2], ['Chocolate Bar', 3]]],
            [4,     3, 10, 'credit', [['Milk Powder', 2], ['Ceylon Black Tea', 2], ['Baking Powder', 2]]],
            [null,  3, 14, 'card',   [['Shampoo', 1], ['Toothpaste', 2], ['Bath Soap', 3]]],
            [null,  2, 9,  'cash',   [['Red Lentils', 2], ['Turmeric Powder', 1], ['Chili Powder', 1]]],
            [5,     2, 11, 'cash',   [['Washing Powder', 2], ['Dish Soap', 2], ['Floor Cleaner', 1]]],
            [null,  2, 16, 'cash',   [['Noodles', 5], ['Cream Crackers', 3], ['Peanuts', 2]]],
            [6,     1, 10, 'credit', [['Samba Rice', 3], ['Coconut Oil', 1], ['Eggs', 1]]],
            [null,  1, 12, 'cash',   [['Fresh Milk', 2], ['Yogurt Plain', 3], ['Condensed Milk', 2]]],
            [null,  1, 15, 'card',   [['Milo', 1], ['Horlicks', 1], ['Ovaltine', 1]]],
            [7,     0, 9,  'cash',   [['White Sugar', 1], ['Red Lentils', 1], ['Ceylon Black Tea', 1]]],
            [null,  0, 11, 'cash',   [['Potato Chips', 6], ['Chocolate Bar', 4], ['Cashew Nuts', 2]]],
            [null,  0, 14, 'card',   [['Shampoo', 2], ['Deodorant', 1], ['Face Wash', 1]]],
        ];

        $invoiceCounter = 1;
        foreach ($salesDefs as $idx => [$custIdx, $daysAgo, $hour, $method, $saleItems]) {
            $customerId  = ($custIdx !== null && isset($customers[$custIdx])) ? $customers[$custIdx] : null;
            $userId      = ($idx % 3 === 0) ? $managerId : $cashierId;
            $saleTime    = Carbon::now()->subDays($daysAgo)->setHour($hour)->setMinute(0)->setSecond(0);

            $subtotal = 0;
            $lines    = [];

            foreach ($saleItems as [$productName, $qty]) {
                $product = $products->first(function ($p) use ($productName) {
                    return stripos($p->name, $productName) !== false;
                });
                if (!$product) continue;

                $price     = (float) $product->selling_price;
                $cost      = (float) $product->cost_price;
                $lineTotal = $price * $qty;
                $subtotal += $lineTotal;

                $lines[] = [
                    'product_id'   => $product->id,
                    'variant_id'   => null,
                    'product_name' => $product->name,
                    'unit_price'   => $price,
                    'cost_price'   => $cost,
                    'qty'          => $qty,
                    'discount'     => 0,
                    'total'        => $lineTotal,
                    'created_at'   => $saleTime,
                    'updated_at'   => $saleTime,
                ];
            }

            if (empty($lines)) continue;

            $total   = $subtotal;
            $paid    = ($method === 'credit') ? 0 : $total;
            $balance = $total - $paid;

            $invoiceNo = 'INV-' . str_pad($invoiceCounter++, 5, '0', STR_PAD_LEFT);

            $saleId = DB::table('sales')->insertGetId([
                'invoice_no'  => $invoiceNo,
                'user_id'     => $userId,
                'customer_id' => $customerId,
                'subtotal'    => $subtotal,
                'discount'    => 0,
                'tax'         => 0,
                'total'       => $total,
                'paid'        => $paid,
                'balance'     => $balance,
                'status'      => ($method === 'credit') ? 'credit' : 'paid',
                'note'        => null,
                'created_at'  => $saleTime,
                'updated_at'  => $saleTime,
            ]);

            foreach ($lines as $line) {
                DB::table('sale_items')->insert(array_merge($line, ['sale_id' => $saleId]));
            }

            if ($method !== 'credit') {
                DB::table('payments')->insert([
                    'sale_id'    => $saleId,
                    'method'     => $method,
                    'amount'     => $paid,
                    'reference'  => null,
                    'created_at' => $saleTime,
                    'updated_at' => $saleTime,
                ]);
            }

            // Update credit_balance for credit sales
            if ($method === 'credit' && $customerId) {
                DB::table('customers')
                    ->where('id', $customerId)
                    ->increment('credit_balance', $balance);
            }
        }
    }
}
