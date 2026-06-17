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
        $data = $request->validate([
            'mac'  => ['required', 'regex:/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i', 'max:17'],
            'shop' => ['required', 'string', 'max:100'],
            'db'   => ['required', 'string', 'max:80', 'regex:/^[\w\-]+\.sqlite$/'],
        ]);

        $mac      = strtolower($data['mac']);
        $devices  = $this->readDevices();

        if (isset($devices[$mac])) {
            return back()->withErrors(['mac' => 'This MAC address is already registered.']);
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

        $devices[$mac] = ['shop' => $data['shop'], 'db' => $data['db']];

        $this->writeDevices($devices);

        return back()->with('success', "Device '{$data['shop']}' registered successfully.");
    }

    // ── Update ───────────────────────────────────────────────────────────────────

    public function update(Request $request, string $mac)
    {
        $mac  = strtolower($mac);
        $data = $request->validate([
            'shop' => ['required', 'string', 'max:100'],
            'db'   => ['required', 'string', 'max:80', 'regex:/^[\w\-]+\.sqlite$/'],
        ]);

        $devices = $this->readDevices();

        if (!isset($devices[$mac])) {
            return back()->withErrors(['mac' => 'Device not found.']);
        }

        $devices[$mac] = ['shop' => $data['shop'], 'db' => $data['db']];

        $this->writeDevices($devices);

        return back()->with('success', 'Device updated successfully.');
    }

    // ── Delete ───────────────────────────────────────────────────────────────────

    public function destroy(Request $request, string $mac)
    {
        $mac     = strtolower($mac);
        $devices = $this->readDevices();

        if (!isset($devices[$mac])) {
            return back()->withErrors(['mac' => 'Device not found.']);
        }

        $dbFile = $devices[$mac]['db'] ?? null;

        unset($devices[$mac]);
        $this->writeDevices($devices);

        // Optionally delete the SQLite file if requested
        if ($request->boolean('delete_db') && $dbFile) {
            $dbPath = database_path($dbFile);
            if (file_exists($dbPath)) {
                unlink($dbPath);
            }
        }

        return back()->with('success', 'Device removed successfully.');
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private function readDevices(): array
    {
        if (!file_exists($this->registryPath)) {
            return [];
        }

        $decoded = json_decode(file_get_contents($this->registryPath), true);

        if (!is_array($decoded)) {
            return [];
        }

        // Strip comment keys
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
        // Point sqlite connection to the new file, run migrations, then restore
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
