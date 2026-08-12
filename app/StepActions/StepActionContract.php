<?php

namespace App\StepActions;

use App\Models\DeploymentStep;
use App\Models\TargetEnvironment;
use phpseclib3\Net\SSH2;

/**
 * Contrat commun à toute "nature d'action" de step de pipeline (commande
 * shell, email, et demain webhook HTTP, Slack, etc.). RunDeploymentJob ne
 * connaît que ce contrat — ajouter un nouveau type d'action ne demande
 * aucune modification du job, juste une nouvelle classe enregistrée dans
 * StepActionRegistry.
 */
interface StepActionContract
{
    /**
     * Identifiant stable stocké en base (`pipeline_steps.type`), et
     * référencé côté front (constants/stepTypes.tsx) pour le libellé/l'icône.
     */
    public static function type(): string;

    /**
     * Règles de validation Laravel pour le contenu de `config`, avec le
     * préfixe `config.` déjà appliqué par l'appelant (ex: retourner
     * ['command' => ['required','string']] pour valider `config.command`).
     */
    public static function rules(): array;

    /**
     * Exécute l'action pour ce step snapshotté. $ssh est la connexion SSH
     * déjà ouverte pour le déploiement si l'environnement cible a un
     * serveur configuré (null sinon) — la plupart des actions autres que
     * "command" l'ignorent.
     *
     * @param  array<string, string>  $env  Variables d'environnement de la TargetEnvironment.
     * @param  array<string, mixed>  $context  Voir App\Support\DeploymentContextBuilder.
     * @param  ?callable(string): void  $onOutput  Appelé avec chaque morceau de sortie dès
     *                                              qu'il est disponible (avant la fin du step), pour permettre
     *                                              un affichage live côté job. Ignoré par les actions qui ne
     *                                              produisent pas de sortie incrémentale (ex: email).
     */
    public function execute(
        DeploymentStep $step,
        TargetEnvironment $targetEnvironment,
        array $env,
        array $context,
        ?SSH2 $ssh,
        string $cancelKey,
        int $timeoutSeconds,
        ?callable $onOutput = null,
    ): StepExecutionResult;
}
