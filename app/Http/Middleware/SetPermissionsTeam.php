<?php

namespace App\Http\Middleware;

use App\Models\Workspace;
use Closure;
use Illuminate\Http\Request;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpFoundation\Response;

class SetPermissionsTeam
{
    /**
     * Resolves the current route's {workspace} binding as the active
     * permissions "team", so role checks are scoped to that workspace.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $workspace = $request->route('workspace');

        if ($workspace instanceof Workspace && $workspace->isSuspended()) {
            abort(403, 'Ce workspace a été suspendu par un administrateur de la plateforme.');
        }

        app(PermissionRegistrar::class)->setPermissionsTeamId(
            $workspace instanceof Workspace ? $workspace->id : null
        );

        return $next($request);
    }
}
