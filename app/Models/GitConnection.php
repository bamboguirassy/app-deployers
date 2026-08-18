<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GitConnection extends Model
{
    protected $fillable = ['workspace_id', 'created_by', 'provider', 'account_login', 'access_token'];

    /**
     * Le token ne doit jamais être sérialisé implicitement (props Inertia) —
     * il n'est utilisé que côté serveur pour interroger l'API du provider.
     */
    protected $hidden = ['access_token'];

    protected function casts(): array
    {
        return [
            'access_token' => 'encrypted',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
