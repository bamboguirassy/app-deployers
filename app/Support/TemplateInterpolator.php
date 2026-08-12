<?php

namespace App\Support;

use Illuminate\Support\Arr;

/**
 * Substitution de variables `{{chemin.imbrique}}` dans un texte fourni par
 * l'utilisateur (ex: corps d'un step "email"). Volontairement une simple
 * substitution de chaîne — PAS de moteur de template exécutable (Blade,
 * eval, etc.) — pour qu'un utilisateur avec seulement `pipeline.manage` ne
 * puisse pas faire exécuter du code arbitraire côté serveur via ce champ.
 */
class TemplateInterpolator
{
    public static function render(string $template, array $context): string
    {
        return preg_replace_callback(
            '/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/',
            fn (array $matches) => (string) (Arr::get($context, $matches[1]) ?? ''),
            $template,
        );
    }
}
