<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class SetTenantDatabase
{
    public function handle(Request $request, Closure $next): Response
    {
        $host   = $request->getHost();
        $map    = config('tenants.domains', []);
        $target = $map[$host] ?? null;

        if ($target) {
            $driver = config('database.default');

            if ($driver === 'sqlite') {
                if (!file_exists($target)) {
                    touch($target);
                }
                config(['database.connections.sqlite.database' => $target]);
                DB::purge('sqlite');
                DB::reconnect('sqlite');
            } else {
                config(['database.connections.mysql.database' => $target]);
                DB::purge('mysql');
                DB::reconnect('mysql');
            }
        }

        return $next($request);
    }
}
