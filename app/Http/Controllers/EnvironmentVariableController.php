<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\TargetEnvironment;
use App\Models\Workspace;
use App\Support\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EnvironmentVariableController extends Controller
{
    /**
     * Enregistre (ou met à jour) en une seule requête toutes les valeurs
     * de variables pour un TargetEnvironment donné.
     *
     * Payload attendu :
     *   variables: [{ target_variable_id: int, value: string }, ...]
     *
     * Les variables du target non présentes dans le payload sont supprimées
     * (l'utilisateur a effacé la valeur) — la validation assure que toutes
     * les variables sans default_value ont bien une valeur soumise.
     */
    public function upsert(Request $request, Workspace $workspace, Application $application, TargetEnvironment $targetEnvironment): RedirectResponse
    {
        $this->authorize('manageEnvironments', $application);
        abort_unless($targetEnvironment->belongsToWorkspace($workspace), 404);

        $targetEnvironment->loadMissing('target.variables');

        $targetVariableIds = $targetEnvironment->target->variables->pluck('id')->all();

        $data = $request->validate([
            'variables'                       => ['required', 'array'],
            'variables.*.target_variable_id'  => ['required', 'integer', 'in:'.implode(',', $targetVariableIds)],
            'variables.*.value'               => ['required', 'string', 'max:65535'],
        ]);

        // Vérifier que toutes les variables sans default_value ont une valeur soumise.
        $submittedIds = collect($data['variables'])->pluck('target_variable_id')->all();

        $missing = $targetEnvironment->target->variables
            ->filter(fn ($v) => $v->default_value === null && ! in_array($v->id, $submittedIds))
            ->pluck('key');

        if ($missing->isNotEmpty()) {
            return back()->withErrors([
                'variables' => 'Valeur manquante pour : '.$missing->join(', ').'.',
            ]);
        }

        // Upsert : insert ou update selon l'existence de la ligne.
        foreach ($data['variables'] as $row) {
            $targetEnvironment->variables()->updateOrCreate(
                ['target_variable_id' => $row['target_variable_id']],
                ['value' => $row['value']],
            );
        }

        // Supprimer les valeurs des variables qui n'ont pas été soumises.
        $targetEnvironment->variables()
            ->whereNotIn('target_variable_id', $submittedIds)
            ->delete();

        AuditLogger::log($application, 'environment_variables.updated', $targetEnvironment);

        return back()->with('status', 'Variables enregistrées.');
    }
}
