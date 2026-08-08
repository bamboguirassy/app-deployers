<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Framework extends Model
{
    protected $fillable = ['name', 'slug', 'category', 'logo_url', 'order'];

    public function targets(): HasMany
    {
        return $this->hasMany(Target::class);
    }
}
