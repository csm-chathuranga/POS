<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): string|null
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => fn () => $request->user()
                    ? Cache::remember(
                        'user_auth_' . $request->user()->id,
                        300,
                        function () use ($request) {
                            $user  = $request->user()->load('roles');
                            $role  = $user->roles->first()?->name ?? 'cashier';
                            return array_merge($user->toArray(), [
                                'role'  => $role,
                                'roles' => $user->roles->pluck('name')->toArray(),
                            ]);
                        }
                    )
                    : null,
            ],
            'flash' => [
                'success' => session('success'),
                'error'   => session('error'),
            ],
            'device' => [
                'shop' => config('tenant.shop'),
            ],
            'appSettings' => fn () => Cache::remember('app_settings_' . request()->getHost(), 300, fn () =>
                Setting::all()->pluck('value', 'key')->only([
                    'ui_language', 'bill_language', 'sidebar_theme', 'primary_color',
                    'shop_name', 'currency', 'tax_rate',
                    'barcode_label_size', 'barcode_show_price',
                    'logo', 'demo_mode', 'printer_name', 'enable_promotions', 'pos_touch_numpad', 'pos_auto_scale', 'pos_scale_value',
                ])
            ),
            'ziggy' => fn () => array_merge(
                Cache::remember('ziggy_routes', 3600, fn () => (new Ziggy)->toArray()),
                ['location' => $request->url()]
            ),
        ];
    }
}
