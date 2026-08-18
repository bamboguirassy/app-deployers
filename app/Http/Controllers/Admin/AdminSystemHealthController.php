<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Deployment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Inertia\Inertia;
use Inertia\Response;

class AdminSystemHealthController extends Controller
{
    public function index(): Response
    {
        $this->authorize('platform-admin.access');

        // Jobs en échec — liste des 20 derniers
        $failedJobs = DB::table('failed_jobs')
            ->orderByDesc('failed_at')
            ->limit(20)
            ->get(['id', 'uuid', 'queue', 'failed_at', 'exception'])
            ->map(fn ($job) => [
                'id' => $job->id,
                'uuid' => $job->uuid,
                'queue' => $job->queue,
                'failed_at' => $job->failed_at,
                'exception_excerpt' => mb_substr($job->exception, 0, 300),
            ]);

        $failedJobsTotal = DB::table('failed_jobs')->count();

        // Taille des files d'attente Redis (jobs en attente dans la table jobs)
        $queueSizes = DB::table('jobs')
            ->select('queue', DB::raw('count(*) as count'), DB::raw('min(available_at) as oldest_at'))
            ->groupBy('queue')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => [
                'queue' => $row->queue,
                'count' => $row->count,
                'oldest_at' => $row->oldest_at,
            ]);

        // Déploiements bloqués (running depuis plus de N minutes)
        $stuckThresholdMinutes = config('deploy.stuck_running_after_minutes', 60);
        $stuckDeployments = Deployment::query()
            ->with([
                'targetEnvironment.target.application',
                'targetEnvironment.environment',
            ])
            ->where('status', 'running')
            ->where('updated_at', '<', now()->subMinutes($stuckThresholdMinutes))
            ->orderBy('updated_at')
            ->get()
            ->map(fn ($d) => [
                'uuid' => $d->uuid,
                'started_at' => $d->created_at->toISOString(),
                'updated_at' => $d->updated_at->toISOString(),
                'minutes_running' => (int) $d->created_at->diffInMinutes(now()),
                'target' => optional($d->targetEnvironment?->target)->name,
                'environment' => optional($d->targetEnvironment?->environment)->name,
                'application' => optional($d->targetEnvironment?->target?->application)->name,
            ]);

        // Statut Reverb — vérification basique via socket TCP
        $reverbPort = (int) env('REVERB_PORT', 8080);
        $reverbHost = env('REVERB_HOST', '127.0.0.1');
        $reverbOnline = false;
        try {
            $sock = @fsockopen($reverbHost, $reverbPort, $errno, $errstr, 1);
            if ($sock) {
                $reverbOnline = true;
                fclose($sock);
            }
        } catch (\Throwable) {
            // non disponible
        }

        return Inertia::render('Admin/SystemHealth', [
            'failedJobs' => $failedJobs,
            'failedJobsTotal' => $failedJobsTotal,
            'queueSizes' => $queueSizes,
            'stuckDeployments' => $stuckDeployments,
            'stuckThresholdMinutes' => $stuckThresholdMinutes,
            'reverbOnline' => $reverbOnline,
            'reverbHost' => $reverbHost,
            'reverbPort' => $reverbPort,
        ]);
    }
}
