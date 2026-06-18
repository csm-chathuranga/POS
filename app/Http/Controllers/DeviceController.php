<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;

class DeviceController extends Controller
{
    private string $registryPath;

    public function __construct()
    {
        $this->registryPath = storage_path('app/devices.json');
    }

    // ── List ─────────────────────────────────────────────────────────────────────

    public function index()
    {
        return Inertia::render('Devices/Index', [
            'devices' => $this->readDevices(),
        ]);
    }

    // ── Create ───────────────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        // Normalize license key: strip spaces, uppercase
        $request->merge(['key' => strtoupper(trim($request->input('key', '')))]);

        $data = $request->validate([
            'key'  => ['required', 'regex:/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/'],
            'shop' => ['required', 'string', 'max:100'],
            'db'   => ['required', 'string', 'max:80', 'regex:/^[\w\-]+\.sqlite$/'],
        ]);

        $key     = $data['key'];
        $devices = $this->readDevices();

        if (isset($devices[$key])) {
            return back()->withErrors(['key' => 'This license key is already registered.']);
        }

        $dbPath = database_path($data['db']);

        // Copy the current default database so the new tenant has a ready schema + seed
        $sourcePath = config('database.connections.sqlite.database');
        if (file_exists($sourcePath) && !file_exists($dbPath)) {
            copy($sourcePath, $dbPath);
        } elseif (!file_exists($dbPath)) {
            touch($dbPath);
            $this->migrateDatabase($dbPath);
        }

        $devices[$key] = ['shop' => $data['shop'], 'db' => $data['db']];

        $this->writeDevices($devices);

        return back()->with('success', "Device '{$data['shop']}' registered successfully.");
    }

    // ── Update ───────────────────────────────────────────────────────────────────

    public function update(Request $request, string $key)
    {
        $data = $request->validate([
            'shop' => ['required', 'string', 'max:100'],
            'db'   => ['required', 'string', 'max:80', 'regex:/^[\w\-]+\.sqlite$/'],
        ]);

        $devices     = $this->readDevices();
        $resolvedKey = $this->resolveKey($devices, $key);

        if ($resolvedKey === null) {
            return back()->withErrors(['key' => 'Device not found.']);
        }

        $devices[$resolvedKey] = ['shop' => $data['shop'], 'db' => $data['db']];

        $this->writeDevices($devices);

        return back()->with('success', 'Device updated successfully.');
    }

    // ── Delete ───────────────────────────────────────────────────────────────────

    public function destroy(Request $request, string $key)
    {
        $devices     = $this->readDevices();
        $resolvedKey = $this->resolveKey($devices, $key);

        if ($resolvedKey === null) {
            return back()->withErrors(['key' => 'Device not found.']);
        }

        $key = $resolvedKey;

        $dbFile = $devices[$key]['db'] ?? null;

        unset($devices[$key]);
        $this->writeDevices($devices);

        if ($request->boolean('delete_db') && $dbFile) {
            $dbPath = database_path($dbFile);
            if (file_exists($dbPath)) {
                unlink($dbPath);
            }
        }

        return back()->with('success', 'Device removed successfully.');
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    // Try exact key, then uppercase — handles both old MAC keys and new license keys
    private function resolveKey(array $devices, string $key): ?string
    {
        if (isset($devices[$key]))                   return $key;
        if (isset($devices[strtoupper($key)]))       return strtoupper($key);
        if (isset($devices[strtolower($key)]))       return strtolower($key);
        return null;
    }

    private function readDevices(): array
    {
        if (!file_exists($this->registryPath)) {
            return [];
        }

        $decoded = json_decode(file_get_contents($this->registryPath), true);

        if (!is_array($decoded)) {
            return [];
        }

        return array_filter($decoded, fn($k) => !str_starts_with($k, '_'), ARRAY_FILTER_USE_KEY);
    }

    private function writeDevices(array $devices): void
    {
        file_put_contents(
            $this->registryPath,
            json_encode($devices, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n"
        );
    }

    private function migrateDatabase(string $dbPath): void
    {
        $original = config('database.connections.sqlite.database');

        config(['database.connections.sqlite.database' => $dbPath]);
        DB::purge('sqlite');
        DB::reconnect('sqlite');

        Artisan::call('migrate', ['--force' => true, '--database' => 'sqlite']);

        config(['database.connections.sqlite.database' => $original]);
        DB::purge('sqlite');
        DB::reconnect('sqlite');
    }
}
