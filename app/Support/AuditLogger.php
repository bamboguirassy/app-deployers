<?php

namespace App\Support;

use App\Models\Application;
use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Request;

class AuditLogger
{
    public static function log(Application $application, string $action, Model $subject, array $changes = []): void
    {
        AuditLog::create([
            'application_id' => $application->id,
            'user_id' => auth()->id(),
            'action' => $action,
            'subject_type' => $subject::class,
            'subject_id' => $subject->getKey(),
            'changes' => $changes,
            'ip_address' => Request::ip(),
        ]);
    }
}
