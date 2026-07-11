<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ElectricShopSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('product_variants')->delete();
        DB::table('products')->delete();
        DB::table('categories')->delete();

        // ── Categories ────────────────────────────────────────────────────────
        $cats = [
            'Televisions'        => 'රූපවාහිනී',
            'Refrigerators'      => 'ශීතකරණ',
            'Washing Machines'   => 'රෙදි සෝදන යන්ත්‍ර',
            'Air Conditioners'   => 'වායු සමීකරණ',
            'Kitchen Appliances' => 'කුස්සිය උපකරණ',
            'Fans'               => 'විදුලි පංකා',
            'Water Heaters'      => 'ජල රත් කිරීමේ',
            'Small Appliances'   => 'කුඩා විදුලි උපකරණ',
            'Lighting'           => 'ආලෝකය',
            'Accessories'        => 'උපාංග',
        ];

        $catIds = [];
        foreach ($cats as $name => $nameSi) {
            $catIds[$name] = DB::table('categories')->insertGetId([
                'name'       => $name,
                'name_si'    => $nameSi,
                'slug'       => Str::slug($name),
                'active'     => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // ── Products with variants ────────────────────────────────────────────
        // Each variant: [label, cost, selling, wholesale, stock]
        // 'base' => index of the default variant shown on product card
        $withVariants = [

            // ── Televisions ──────────────────────────────────────────────────
            [
                'cat' => 'Televisions', 'name' => 'LED TV', 'name_si' => 'LED රූපවාහිනිය',
                'sku' => 'TV-LED', 'unit' => 'pcs', 'base' => 1,
                'v' => [
                    ['32 inch',   28000,  35000,  32000, 5],
                    ['43 inch',   48000,  58000,  54000, 4],
                    ['55 inch',   75000,  88000,  83000, 3],
                    ['65 inch',  110000, 130000, 122000, 2],
                ],
            ],
            [
                'cat' => 'Televisions', 'name' => 'Smart TV Android', 'name_si' => 'ස්මාර්ට් රූපවාහිනිය',
                'sku' => 'TV-SMA', 'unit' => 'pcs', 'base' => 1,
                'v' => [
                    ['43 inch',   58000,  72000,  67000, 3],
                    ['55 inch',   88000, 108000, 101000, 3],
                    ['65 inch',  130000, 158000, 148000, 2],
                ],
            ],

            // ── Refrigerators ────────────────────────────────────────────────
            [
                'cat' => 'Refrigerators', 'name' => 'Single Door Refrigerator', 'name_si' => 'තනි දොර ශීතකරණය',
                'sku' => 'FRG-SIN', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['170L',  32000,  42000,  39000, 4],
                    ['220L',  42000,  54000,  50000, 3],
                    ['280L',  55000,  68000,  63000, 2],
                ],
            ],
            [
                'cat' => 'Refrigerators', 'name' => 'Double Door Refrigerator', 'name_si' => 'දෙදොර ශීතකරණය',
                'sku' => 'FRG-DBL', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['300L',  68000,  85000,  79000, 3],
                    ['400L',  88000, 108000, 101000, 2],
                    ['500L', 115000, 140000, 130000, 2],
                ],
            ],
            [
                'cat' => 'Refrigerators', 'name' => 'Chest Freezer', 'name_si' => 'පපුව ශීතකරණය',
                'sku' => 'FRG-CHT', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['100L',  28000,  36000,  33000, 3],
                    ['200L',  42000,  52000,  48000, 2],
                    ['300L',  58000,  72000,  67000, 2],
                ],
            ],

            // ── Washing Machines ─────────────────────────────────────────────
            [
                'cat' => 'Washing Machines', 'name' => 'Twin Tub Washing Machine', 'name_si' => 'ද්විත්ව ටබ් රෙදිසෝදන',
                'sku' => 'WM-TWT', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['6kg',  18000,  24000,  22000, 3],
                    ['8kg',  22000,  29000,  27000, 3],
                ],
            ],
            [
                'cat' => 'Washing Machines', 'name' => 'Front Load Washing Machine', 'name_si' => 'ඉදිරිපස ලෝඩ් රෙදිසෝදන',
                'sku' => 'WM-FRL', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['6kg',  45000,  58000,  54000, 2],
                    ['8kg',  58000,  72000,  67000, 2],
                    ['10kg', 72000,  88000,  82000, 2],
                ],
            ],
            [
                'cat' => 'Washing Machines', 'name' => 'Top Load Washing Machine', 'name_si' => 'ඉහළ ලෝඩ් රෙදිසෝදන',
                'sku' => 'WM-TPL', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['7kg',  38000,  48000,  44000, 3],
                    ['9kg',  50000,  62000,  58000, 2],
                ],
            ],

            // ── Air Conditioners ─────────────────────────────────────────────
            [
                'cat' => 'Air Conditioners', 'name' => 'Split AC', 'name_si' => 'ස්ප්ලිට් වායු සමීකරණය',
                'sku' => 'AC-SPL', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['9000 BTU (1HP)',   58000,  75000,  70000, 3],
                    ['12000 BTU (1.5HP)',72000,  90000,  84000, 3],
                    ['18000 BTU (2HP)',  95000, 118000, 110000, 2],
                    ['24000 BTU (2.5HP)',125000,155000, 145000, 2],
                ],
            ],
            [
                'cat' => 'Air Conditioners', 'name' => 'Inverter AC', 'name_si' => 'ඉන්වර්ටර් වායු සමීකරණය',
                'sku' => 'AC-INV', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['12000 BTU (1.5HP)',  88000, 110000, 103000, 2],
                    ['18000 BTU (2HP)',   115000, 142000, 133000, 2],
                    ['24000 BTU (2.5HP)', 145000, 178000, 167000, 1],
                ],
            ],

            // ── Kitchen Appliances ───────────────────────────────────────────
            [
                'cat' => 'Kitchen Appliances', 'name' => 'Electric Kettle', 'name_si' => 'විදුලි කේතලය',
                'sku' => 'KIT-KTL', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['1.5L',  2800,  3800,  3500, 10],
                    ['1.7L',  3200,  4200,  3900,  8],
                    ['2.0L',  3800,  5000,  4600,  6],
                ],
            ],
            [
                'cat' => 'Kitchen Appliances', 'name' => 'Rice Cooker', 'name_si' => 'බත් උයන යන්ත්‍රය',
                'sku' => 'KIT-RCK', 'unit' => 'pcs', 'base' => 1,
                'v' => [
                    ['1.0L',  3500,  4800,  4400, 8],
                    ['1.8L',  4800,  6500,  6000, 8],
                    ['2.8L',  6500,  8800,  8100, 5],
                    ['4.2L',  9000, 12000, 11000, 3],
                ],
            ],
            [
                'cat' => 'Kitchen Appliances', 'name' => 'Blender', 'name_si' => 'බ්ලෙන්ඩරය',
                'sku' => 'KIT-BLD', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['1.5L 500W',  3500,  4800,  4400,  8],
                    ['1.5L 750W',  5500,  7200,  6700,  6],
                    ['2.0L 1000W', 8000, 10500,  9800,  4],
                ],
            ],
            [
                'cat' => 'Kitchen Appliances', 'name' => 'Microwave Oven', 'name_si' => 'මයික්‍රෝවේව් උදුන',
                'sku' => 'KIT-MWO', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['20L Solo',    18000, 24000, 22000, 4],
                    ['25L Grill',   25000, 32000, 30000, 3],
                    ['30L Convection', 38000, 48000, 44000, 2],
                ],
            ],
            [
                'cat' => 'Kitchen Appliances', 'name' => 'Electric Iron', 'name_si' => 'විදුලි යකඩය',
                'sku' => 'KIT-IRN', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['1000W Dry',   1500,  2200,  2000, 10],
                    ['1600W Steam', 3200,  4500,  4100,  8],
                    ['2400W Steam', 5500,  7500,  6900,  5],
                ],
            ],
            [
                'cat' => 'Kitchen Appliances', 'name' => 'Food Processor', 'name_si' => 'ආහාර සකසන යන්ත්‍රය',
                'sku' => 'KIT-FPR', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['600W',  6500,  8800,  8100, 4],
                    ['800W',  9500, 12500, 11600, 3],
                ],
            ],
            [
                'cat' => 'Kitchen Appliances', 'name' => 'Sandwich Maker', 'name_si' => 'සැන්ඩ්විච් සෑදීම',
                'sku' => 'KIT-SWM', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['700W',  2200,  3200,  2900, 6],
                    ['1000W', 3500,  4800,  4400, 4],
                ],
            ],
            [
                'cat' => 'Kitchen Appliances', 'name' => 'Electric Cooker (Hot Plate)', 'name_si' => 'විදුලි උදුන',
                'sku' => 'KIT-HPL', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['Single 1000W', 3500,  4800,  4400, 5],
                    ['Double 2000W', 6500,  8800,  8100, 4],
                ],
            ],

            // ── Fans ─────────────────────────────────────────────────────────
            [
                'cat' => 'Fans', 'name' => 'Ceiling Fan', 'name_si' => 'සිවිලිම් පංකාව',
                'sku' => 'FAN-CEL', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['48 inch', 5500,  7500,  6900, 8],
                    ['56 inch', 7500,  9800,  9100, 6],
                ],
            ],
            [
                'cat' => 'Fans', 'name' => 'Table Fan', 'name_si' => 'මේස පංකාව',
                'sku' => 'FAN-TBL', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['9 inch',  1800,  2600,  2400, 8],
                    ['12 inch', 2500,  3500,  3200, 6],
                    ['16 inch', 3500,  4800,  4400, 5],
                ],
            ],
            [
                'cat' => 'Fans', 'name' => 'Stand Fan', 'name_si' => 'නිල් පංකාව',
                'sku' => 'FAN-STD', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['16 inch', 4500,  6000,  5600, 5],
                    ['18 inch', 6000,  7800,  7200, 4],
                ],
            ],
            [
                'cat' => 'Fans', 'name' => 'Exhaust Fan', 'name_si' => 'පිටතට ගලා යන පංකාව',
                'sku' => 'FAN-EXH', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['6 inch',  1500,  2200,  2000, 6],
                    ['8 inch',  2200,  3000,  2800, 4],
                    ['12 inch', 3800,  5200,  4800, 3],
                ],
            ],

            // ── Water Heaters ────────────────────────────────────────────────
            [
                'cat' => 'Water Heaters', 'name' => 'Instant Water Heater', 'name_si' => 'ක්ෂණික ජල රත් කිරීම',
                'sku' => 'WH-INS', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['3kW',  5500,  7500,  6900, 5],
                    ['4.5kW', 7500, 9800,  9100, 4],
                    ['6kW',  9500, 12500, 11600, 3],
                ],
            ],
            [
                'cat' => 'Water Heaters', 'name' => 'Storage Water Heater', 'name_si' => 'ගබඩා ජල රත් කිරීම',
                'sku' => 'WH-STO', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['10L', 12000, 16000, 14800, 3],
                    ['15L', 16000, 21000, 19500, 3],
                    ['25L', 22000, 28000, 26000, 2],
                ],
            ],

            // ── Small Appliances ─────────────────────────────────────────────
            [
                'cat' => 'Small Appliances', 'name' => 'Hair Dryer', 'name_si' => 'හිස් කෙස් වියලන්නා',
                'sku' => 'SMA-HDR', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['1000W', 1800,  2600,  2400, 6],
                    ['1600W', 2800,  3800,  3500, 5],
                    ['2200W', 4500,  6000,  5600, 3],
                ],
            ],
            [
                'cat' => 'Small Appliances', 'name' => 'Electric Shaver', 'name_si' => 'විදුලි රේසරය',
                'sku' => 'SMA-SHV', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['Rotary',  3500,  4800,  4400, 5],
                    ['Foil',    5500,  7500,  6900, 4],
                ],
            ],
            [
                'cat' => 'Small Appliances', 'name' => 'Vacuum Cleaner', 'name_si' => 'රික්ත පිරිසිදු කරන්නා',
                'sku' => 'SMA-VAC', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['800W Dry',       8500, 11500, 10700, 3],
                    ['1200W Dry/Wet', 14000, 18500, 17200, 2],
                ],
            ],
            [
                'cat' => 'Small Appliances', 'name' => 'UPS', 'name_si' => 'UPS විදුලි සැපයුම',
                'sku' => 'SMA-UPS', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['600VA',  4500,  6200,  5800, 5],
                    ['1000VA', 7500, 10000,  9300, 4],
                    ['1500VA', 12000, 16000, 14900, 3],
                ],
            ],

            // ── Lighting ─────────────────────────────────────────────────────
            [
                'cat' => 'Lighting', 'name' => 'LED Bulb', 'name_si' => 'LED බල්බය',
                'sku' => 'LGT-LED', 'unit' => 'pcs', 'base' => 1,
                'v' => [
                    ['5W',  120,  180,  160, 50],
                    ['9W',  150,  220,  200, 50],
                    ['13W', 180,  260,  240, 30],
                    ['18W', 250,  360,  330, 20],
                ],
            ],
            [
                'cat' => 'Lighting', 'name' => 'LED Panel Light', 'name_si' => 'LED පැනල් ආලෝකය',
                'sku' => 'LGT-PNL', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['12W',  650,  950,  880, 20],
                    ['18W',  850, 1250, 1150, 15],
                    ['24W', 1100, 1600, 1480, 10],
                ],
            ],
            [
                'cat' => 'Lighting', 'name' => 'Tube Light (LED)', 'name_si' => 'ලූමිනේ ආලෝකය',
                'sku' => 'LGT-TBL', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['18W 2ft', 350,  520,  480, 20],
                    ['20W 4ft', 450,  650,  600, 20],
                ],
            ],
            [
                'cat' => 'Lighting', 'name' => 'Emergency Light', 'name_si' => 'හදිසි ආලෝකය',
                'sku' => 'LGT-EMG', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['Handheld',   650,  950,  880, 10],
                    ['Wall Mount', 950, 1400, 1300,  8],
                ],
            ],

            // ── Accessories ──────────────────────────────────────────────────
            [
                'cat' => 'Accessories', 'name' => 'Extension Cord', 'name_si' => 'දිගු සම්බන්ධකය',
                'sku' => 'ACC-EXT', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['3 socket 3m',  550,  850,  780, 15],
                    ['4 socket 5m',  850, 1300, 1200, 10],
                    ['6 socket 5m', 1200, 1800, 1680,  8],
                ],
            ],
            [
                'cat' => 'Accessories', 'name' => 'HDMI Cable', 'name_si' => 'HDMI කේබලය',
                'sku' => 'ACC-HDM', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['1.5m', 350,  550,  510, 15],
                    ['3m',   550,  850,  780, 10],
                    ['5m',   850, 1300, 1200,  8],
                ],
            ],
            [
                'cat' => 'Accessories', 'name' => 'Stabilizer', 'name_si' => 'ස්ථායීකාරකය',
                'sku' => 'ACC-STB', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['500VA',  2500,  3600,  3300, 5],
                    ['1000VA', 3800,  5500,  5100, 4],
                    ['2000VA', 6500,  9000,  8400, 3],
                    ['5000VA', 15000, 20000, 18700, 2],
                ],
            ],
            [
                'cat' => 'Accessories', 'name' => 'Remote Control (Universal)', 'name_si' => 'විශ්වීය දුරස්ථ පාලකය',
                'sku' => 'ACC-RMT', 'unit' => 'pcs', 'base' => 0,
                'v' => [
                    ['TV Universal',  350,  550,  510, 10],
                    ['AC Universal',  450,  680,  630,  8],
                ],
            ],
        ];

        $tenant = config('database.connections.mysql.database');

        foreach ($withVariants as $p) {
            $base      = $p['v'][$p['base']];
            $baseCost  = $base[1];
            $basePrice = $base[2];
            $baseWs    = $base[3];
            $baseStock = $base[4];

            $pid = DB::table('products')->insertGetId([
                'category_id'     => $catIds[$p['cat']],
                'name'            => $p['name'],
                'name_si'         => $p['name_si'],
                'sku'             => $p['sku'],
                'barcode'         => strtoupper($p['sku']) . '-' . strtoupper(Str::random(6)),
                'unit'            => $p['unit'],
                'cost_price'      => $baseCost,
                'selling_price'   => $basePrice,
                'wholesale_price' => $baseWs,
                'stock_qty'       => $baseStock,
                'alert_qty'       => 2,
                'active'          => true,
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);

            foreach ($p['v'] as [$label, $cost, $price, $ws, $stock]) {
                DB::table('product_variants')->insert([
                    'product_id'         => $pid,
                    'label'              => $label,
                    'barcode'            => null,
                    'cost_price'         => $cost,
                    'selling_price'      => $price,
                    'wholesale_price'    => $ws,
                    'stock_qty'          => $stock,
                    'alert_qty'          => 1,
                    'conversion_factor'  => 1,
                    'created_at'         => now(),
                    'updated_at'         => now(),
                ]);
            }
        }

        // Clear server-side product cache so new items load immediately
        Cache::forget($tenant . '_api_products_all');
    }
}
