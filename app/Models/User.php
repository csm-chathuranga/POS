<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = ['role'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
    ];

    // ── Relationships ──────────────────────────────

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'user_role');
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    public function purchases()
    {
        return $this->hasMany(Purchase::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }

    // ── Role helpers ───────────────────────────────

    public function getRoleAttribute(): string
    {
        return $this->roles->first()?->name ?? 'cashier';
    }

    public function hasRole(string $role): bool
    {
        return $this->roles->contains('name', $role);
    }

    public function isAdmin(): bool   { return $this->hasRole('admin'); }
    public function isManager(): bool { return $this->hasRole('admin') || $this->hasRole('manager'); }
    public function isCashier(): bool { return $this->hasRole('cashier'); }

    public function assignRole(string $roleName): void
    {
        $role = Role::where('name', $roleName)->first();
        if ($role) {
            $this->roles()->syncWithoutDetaching($role->id);
        }
    }

    public function syncRole(string $roleName): void
    {
        $role = Role::where('name', $roleName)->first();
        $this->roles()->sync($role ? [$role->id] : []);
    }
}
