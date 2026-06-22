<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            [
                'name'    => 'Kamal Perera',
                'company' => 'Prima Ceylon Ltd',
                'phone'   => '0112345678',
                'email'   => 'kamal@prima.lk',
                'address' => 'No.5, Trincomalee St, Colombo 01',
                'active'  => true,
            ],
            [
                'name'    => 'Nimal Silva',
                'company' => 'Lakvijaya Distributors',
                'phone'   => '0777112233',
                'email'   => 'nimal@lakvijaya.lk',
                'address' => 'No.12, Kandy Road, Gampaha',
                'active'  => true,
            ],
            [
                'name'    => 'Suresh Fernando',
                'company' => 'Nestlé Lanka Ltd',
                'phone'   => '0112678900',
                'email'   => 'suresh@nestle.lk',
                'address' => 'No.440, Nawala Road, Rajagiriya',
                'active'  => true,
            ],
            [
                'name'    => 'Priya Jayawardena',
                'company' => 'Unilever Sri Lanka',
                'phone'   => '0114567890',
                'email'   => 'priya@unilever.lk',
                'address' => '258, Grandpass Road, Colombo 14',
                'active'  => true,
            ],
            [
                'name'    => 'Roshan De Silva',
                'company' => 'Maliban Biscuits (Pvt) Ltd',
                'phone'   => '0775566778',
                'email'   => 'roshan@maliban.lk',
                'address' => 'No.30, Galle Road, Colombo 03',
                'active'  => true,
            ],
            [
                'name'    => 'Chaminda Rathnayake',
                'company' => 'Ceylon Tea Exports',
                'phone'   => '0716789012',
                'email'   => 'chaminda@ceylontea.lk',
                'address' => 'No.8, Bodhiraja Mawatha, Kandy',
                'active'  => true,
            ],
            [
                'name'    => 'Thilak Wickramasinghe',
                'company' => 'Lanka Agri Products',
                'phone'   => '0779900112',
                'email'   => 'thilak@lankaagri.lk',
                'address' => 'Polgahawela, Kurunegala',
                'active'  => true,
            ],
        ];

        foreach ($suppliers as $s) {
            DB::table('suppliers')->insert(array_merge($s, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
