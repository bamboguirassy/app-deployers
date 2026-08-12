<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Request;

/**
 * Pendant de AuditLogger::log() pour les actions du panneau super-admin, qui
 * ne sont rattachées à aucune Application (ex: suspension d'un workspace,
 * changement de plan, promotion/rétrogradation d'un utilisateur). Écrit dans
 * la même table `audit_logs` (application_id nullable) avec
 * context = 'platform_admin' pour les distinguer des entrées applicatives.
 */
class PlatformAuditLogger
{
    public static function log(string $action, Model $subject, array $changes = []): void
    {
        AuditLog::create([
            'application_id' => null,
            'context' => 'platform_admin',
            'user_id' => auth()->id(),
            'action' => $action,
            'subject_type' => $subject::class,
            'subject_id' => $subject->getKey(),
            'changes' => $changes,
            'ip_address' => Request::ip(),
        ]);
    }
}
