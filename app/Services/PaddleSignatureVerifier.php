<?php

namespace App\Services;

use Illuminate\Http\Request;

/**
 * Vérification manuelle de la signature webhook Paddle Billing (header
 * `Paddle-Signature`, format `ts=<timestamp>;h1=<hmac>`), sans le SDK
 * officiel — voir PaddleClient pour la raison de ce choix. Algorithme :
 * HMAC-SHA256 de "<timestamp>:<raw_body>" avec le secret du endpoint webhook,
 * comparé en temps constant.
 */
class PaddleSignatureVerifier
{
    public function verify(Request $request): bool
    {
        $header = $request->header('Paddle-Signature');
        $secret = config('paddle.webhook_secret');

        if (! $header || ! $secret) {
            return false;
        }

        $parts = [];
        foreach (explode(';', $header) as $segment) {
            [$key, $value] = array_pad(explode('=', $segment, 2), 2, null);
            $parts[$key] = $value;
        }

        $timestamp = $parts['ts'] ?? null;
        $signature = $parts['h1'] ?? null;

        if (! $timestamp || ! $signature) {
            return false;
        }

        $tolerance = config('paddle.signature_tolerance_seconds');
        if (abs(time() - (int) $timestamp) > $tolerance) {
            return false;
        }

        $signedPayload = $timestamp.':'.$request->getContent();
        $expected = hash_hmac('sha256', $signedPayload, $secret);

        return hash_equals($expected, $signature);
    }
}
