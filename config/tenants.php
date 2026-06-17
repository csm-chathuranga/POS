<?php

/*
|--------------------------------------------------------------------------
| Domain → Database Mapping  (browser / non-Electron fallback)
|--------------------------------------------------------------------------
|
| Electron devices are identified by X-Device-Mac header and configured in
| storage/app/devices.json.  This map is only used when no MAC header is
| present (e.g. someone opens the URL directly in a browser).
|
| SQLite: absolute file path.   MySQL: database name.
|
*/

return [

    'domains' => [
        'localhost'            => database_path('database.sqlite'),
        'pos.lumac.lk'        => database_path('database.sqlite'),
        'asitha-pos.lumac.lk' => database_path('asitha.sqlite'),
    ],

];
