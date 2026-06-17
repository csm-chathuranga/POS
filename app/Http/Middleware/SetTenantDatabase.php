<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class SetTenantDatabase
{
    private static array $cache = [];

    public function handle(Request $request, Closure $next): Response
    {
        $device = $this->resolveDevice($request);

        if ($device) {
            $this->switchDatabase(database_path($device['db']));

            // Make shop name available to controllers and Inertia shared props
            config(['tenant.shop' => $device['shop'] ?? null]);
        }

        return $next($request);
    }

    private function resolveDevice(Request $request): ?array
    {
        // Electron: MAC header takes full priority
        $mac = strtolower(trim($request->header('X-Device-Mac', '')));
        if ($mac) {
            $registry = $this->loadRegistry();
            $entry    = $registry[$mac] ?? null;
            if ($entry && !empty($entry['db'])) {
                return $entry;
            }
        }

        // Browser fallback: domain map from config/tenants.php
        $domainMap = config('tenants.domains', []);
        $dbPath    = $domainMap[$request->getHost()] ?? null;
        if ($dbPath) {
            return ['shop' => null, 'db' => $dbPath];
        }

        return null;
    }

    private function loadRegistry(): array
    {
        if (self::$cache) {
            return self::$cache;
        }

        $path = storage_path('app/devices.json');

        if (!file_exists($path)) {
            return [];
        }

        $decoded = json_decode(file_get_contents($path), true);

        if (!is_array($decoded)) {
            return [];
        }

        // Strip meta keys that start with underscore
        self::$cache = array_filter($decoded, fn($k) => !str_starts_with($k, '_'), ARRAY_FILTER_USE_KEY);

        return self::$cache;
    }

    private function switchDatabase(string $dbPath): void
    {
        if (!file_exists($dbPath)) {
            touch($dbPath);
        }

        $driver = config('database.default');

        if ($driver === 'sqlite') {
            config(['database.connections.sqlite.database' => $dbPath]);
            DB::purge('sqlite');
            DB::reconnect('sqlite');
        } else {
            // For MySQL the 'db' value should be a database name, not a file path
            config(['database.connections.mysql.database' => basename($dbPath, '.sqlite')]);
            DB::purge('mysql');
            DB::reconnect('mysql');
        }
    }
}
