<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Application extends Model
{
    protected $fillable = ['workspace_id', 'name', 'slug', 'description', 'created_by', 'logo_path'];

    protected $appends = ['logo_url'];

    protected function logoUrl(): Attribute
    {
        return Attribute::get(fn () => $this->logo_path ? Storage::disk('public')->url($this->logo_path) : null);
    }

    protected static function booted(): void
    {
        static::creating(function (Application $application) {
            $application->uuid ??= (string) Str::uuid();
            $application->slug ??= Str::slug($application->name).'-'.Str::lower(Str::random(4));
        });
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    /**
     * Utilisateurs explicitement autorisés à voir cette application (accès binaire,
     * sans rôle propre — le rôle vient du workspace). Le owner du workspace voit
     * toutes les applications sans figurer nécessairement ici.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'application_user');
    }

    public function environments(): HasMany
    {
        return $this->hasMany(Environment::class)->orderBy('order');
    }

    public function targets(): HasMany
    {
        return $this->hasMany(Target::class)->orderBy('order');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }
}
