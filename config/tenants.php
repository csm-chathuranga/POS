<?php

/*
|--------------------------------------------------------------------------
| Tenant Database Map
|--------------------------------------------------------------------------
| Maps each domain/subdomain to its own MySQL database credentials.
| Add one entry per client shop. The host key must match the exact
| HTTP Host header (no port, no trailing slash).
|chandana.lumac.lk
| Example:
|   'asitha-pos.lumac.lk' => [
|       'database' => 'asitha_lmucpos',
|       'username' => 'asitha_dbuser',
|       'password' => 'secret',
|       'host'     => 'localhost',   // optional, defaults to DB_HOST
|   ],
*/

return [
    'lover-kahatagasdigiliya.lumac.cc' => [
        'database' => 'lover_kahatagasdigiliya',
        'username' => 'pos_user',
        'password' => 'Pos@2026Strong',
    ],
    'chandana.lumac.cc' => [
        'database' => 'chandana_super',
        'username' => 'pos_user',
        'password' => 'Pos@2026Strong',
    ],
    'hiruna-marketing.lumac.cc' => [
        'database' => 'hiruna_marketing',
        'username' => 'pos_user',
        'password' => 'Pos@2026Strong',
    ],
    'pos.lumac.cc' => [
        'database' => 'enewirathna_super',
        'username' => 'pos_user',
        'password' => 'Pos@2026Strong',
    ],
    'localhost' => [
        'database' => 'ranali',
        'username' => 'root',
        'password' => 'root',
    ],

    
];
