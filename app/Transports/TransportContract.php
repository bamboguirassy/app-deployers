<?php

namespace App\Transports;

use App\Models\TargetEnvironment;

/**
 * Contrat commun à tout transport de livraison d'un build centralisé
 * (rsync par-dessus SSH, SFTP, FTP). Miroir volontaire de
 * App\StepActions\StepActionContract : RunDeploymentJob ne connaît que ce
 * contrat via TransportRegistry — ajouter un nouveau transport ne demande
 * aucune modification du job.
 */
interface TransportContract
{
    /**
     * Identifiant stable stocké en base (`servers.connection_type`).
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
