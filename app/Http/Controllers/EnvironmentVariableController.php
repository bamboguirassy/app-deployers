<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\EnvironmentVariable;
use App\Models\TargetEnvironment;
use App\Models\Workspace;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EnvironmentVariableController extends Controller
{
    /**
     * Enregistre (ou met à jour) en une seule requête toutes les valeurs
     * de variables pour un TargetEnvironment donné.
     *
     * Payload attendu :
     *   variables: [{ target_variable_id: int, value: string|null }, ...]
     *
     * Pour les variables secrètes, value === null signifie « conserver la valeur
     * existante » (masquée en Inertia, jamais renvoyée au client). Une valeur non
     * nulle remplace toujours la valeur précédente.
     *
     * Les variables non présentes dans le payload sont supprimées (l'utilisateur
     * a effacé la valeur) — la validation assure que toutes les variables sans
     * default_value ont bien une valeur soumise ou une valeur existante.
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
            'variables.*.value'               => ['nullable', 'string', 'max:65535'],
        ]);

        $targetVariableMap = $targetEnvironment->target->variables->keyBy('id');
        $submittedIds      = collect($data['variables'])->pluck('target_variable_id')->all();
        $submittedByVarId  = collect($data['variables'])->keyBy('target_variable_id');

        // IDs des secrets qui ont déjà une valeur stockée — un null soumis pour
        // ceux-ci signifie « inchangé », pas « supprimer ».
        $existingSecretIds = $targetEnvironment->variables()
            ->whereIn(
                'target_variable_id',
                $targetVariableMap->where('is_secret', true)->pluck('id'),
            )
            ->pluck('target_variable_id')
            ->all();

        // Vérifier que toutes les variables obligatoires ont une valeur effective.
        $missing = $targetEnvironment->target->variables->filter(function ($v) use ($submittedByVarId, $existingSecretIds) {
            $row = $submittedByVarId[$v->id] ?? null;
            $submitted = $row ? ($row['value'] ?? null) : null;

            if ($submitted !== null && $submitted !== '') {
                return false; // valeur soumise → OK
            }

            if ($v->default_value !== null) {
                return false; // a une valeur par défaut → OK
            }

            if ($v->is_secret && in_array($v->id, $existingSecretIds)) {
                return false; // secret inchangé (null soumis = conserver) → OK
            }

            return true; // obligatoire, sans valeur effective → manquant
        })->pluck('key');

        if ($missing->isNotEmpty()) {
            return back()->withErrors([
                'variables' => 'Valeur manquante pour : '.$missing->join(', ').'.',
            ]);
        }

        foreach ($data['variables'] as $row) {
            $value    = $row['value'] ?? null;
            $targetVar = $targetVariableMap[$row['target_variable_id']];

            // Null pour un secret = « conserver » ; on ne touche pas à la ligne existante.
            if ($targetVar->is_secret && ($value === null || $value === '')) {
                continue;
            }

            $targetEnvironment->variables()->updateOrCreate(
                ['target_variable_id' => $row['target_variable_id']],
                ['value' => $value],
            );
        }

        // Supprimer les valeurs des variables non soumises, sauf les secrets
        // inchangés (null soumis dans le payload mais déjà stockés).
        $keptSecretIds = collect($data['variables'])
            ->filter(fn ($row) => $targetVariableMap[$row['target_variable_id']]->is_secret
                && ($row['value'] === null || $row['value'] === '')
                && in_array($row['target_variable_id'], $existingSecretIds))
            ->pluck('target_variable_id')
            ->all();

        $targetEnvironment->variables()
            ->whereNotIn('target_variable_id', array_merge($submittedIds, $keptSecretIds))
            ->delete();

        AuditLogger::log($application, 'environment_variables.updated', $targetEnvironment);

        return back()->with('status', 'Variables enregistrées.');
    }

    /**
     * Retourne la valeur déchiffrée d'une variable secrète à la demande.
     * Réservé aux managers / owners (manageEnvironments).
     */
    public function reveal(Workspace $workspace, Application $application, TargetEnvironment $targetEnvironment, EnvironmentVariable $environmentVariable): JsonResponse
    {
        $this->authorize('manageEnvironments', $application);
        abort_unless($targetEnvironment->belongsToWorkspace($workspace), 404);
        abort_unless($environmentVariable->target_environment_id === $targetEnvironment->id, 404);

        $environmentVariable->loadMissing('targetVariable');
        abort_unless($environmentVariable->targetVariable?->is_secret, 403);

        AuditLogger::log($application, 'environment_variable.revealed', $environmentVariable);

        return response()->json(['value' => $environmentVariable->value]);
    }
}
