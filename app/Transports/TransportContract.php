<?php

namespace App\Transports;

use App\Models\TargetEnvironment;

/**
 * Contrat commun à tout transport de synchronisation de fichiers (rsync
 * par-dessus SSH, SFTP, FTP), consommé par App\StepActions\SyncStepAction —
 * un step de pipeline ordinaire, choisi librement par l'utilisateur. Miroir
 * volontaire de App\StepActions\StepActionContract : ni RunDeploymentJob ni
 * SyncStepAction n'ont besoin de connaître la liste des transports
 * existants, juste TransportRegistry.
 */
interface TransportContract
{
    /**
     * Identifiant stable choisi par l'utilisateur dans la config du step
     * `sync` (`config.transport`, voir SyncStepAction::rules()).
     */
    public static function type(): string;

    /**
     * Synchronise le contenu de $localPath (le build_output_path résolu du
     * workspace éphémère) vers la destination de $targetEnvironment
     * (deploy_path sur $targetEnvironment->server). Ne synchronise jamais le
     * workspace de build entier — seulement ce dossier déjà résolu par
     * l'appelant.
     *
     * @param  ?callable(string): void  $onOutput  Sortie incrémentale, pour l'affichage live
     *                                              côté job (même usage que StepActionContract::execute()).
     */
    public function sync(
        string $localPath,
        TargetEnvironment $targetEnvironment,
        string $cancelKey,
        ?callable $onOutput = null,
    ): TransportSyncResult;
}
