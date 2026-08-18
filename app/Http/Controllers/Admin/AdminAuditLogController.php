<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdminAuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('platform-admin.access');

        $query = AuditLog::query()
            ->with('user:id,name,email')
            ->where('context', 'platform_admin')
            ->orderByDesc('created_at');

        if ($action = $request->input('action')) {
            $query->where('action', $action);
        }

        if ($userId = $request->input('user_id')) {
            $query->where('user_id', $userId);
        }

        if ($from = $request->input('from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->input('to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        $logs = $query->paginate(50)->through(fn ($log) => [
            'id' => $log->id,
            'action' => $log->action,
            'subject_type' => class_basename($log->subject_type),
            'subject_id' => $log->subject_id,
            'changes' => $log->changes,
            'ip_address' => $log->ip_address,
            'created_at' => $log->created_at->toISOString(),
            'user' => $log->user ? [
                'id' => $log->user->id,
                'name' => $log->user->name,
                'email' => $log->user->email,
            ] : null,
        ]);

        $distinctActions = AuditLog::where('context', 'platform_admin')
            ->select('action')
            ->distinct()
            ->orderBy('action')
            ->pluck('action');

        $admins = User::where('is_super_admin', true)
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return Inertia::render('Admin/AuditLog', [
            'logs' => $logs,
            'distinctActions' => $distinctActions,
            'admins' => $admins,
            'filters' => $request->only(['action', 'user_id', 'from', 'to']),
        ]);
    }
}
