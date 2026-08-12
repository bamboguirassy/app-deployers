<?php

namespace Tests\Feature;

use App\Services\PaddleSignatureVerifier;
use Illuminate\Http\Request;
use Tests\TestCase;

class PaddleSignatureVerifierTest extends TestCase
{
    private const SECRET = 'test-webhook-secret';

    protected function setUp(): void
    {
        parent::setUp();

        config(['paddle.webhook_secret' => self::SECRET, 'paddle.signature_tolerance_seconds' => 300]);
    }

    private function signedRequest(string $body, ?int $timestamp = null, ?string $secret = null): Request
    {
        $timestamp ??= time();
        $signedPayload = $timestamp.':'.$body;
        $signature = hash_hmac('sha256', $signedPayload, $secret ?? self::SECRET);

        return Request::create('/webhooks/paddle', 'POST', content: $body, server: [
            'HTTP_PADDLE_SIGNATURE' => "ts={$timestamp};h1={$signature}",
        ]);
    }

    public function test_a_correctly_signed_payload_is_verified(): void
    {
        $request = $this->signedRequest('{"event_type":"subscription.updated"}');

        $this->assertTrue((new PaddleSignatureVerifier())->verify($request));
    }

    public function test_a_payload_signed_with_the_wrong_secret_is_rejected(): void
    {
        $request = $this->signedRequest('{"event_type":"subscription.updated"}', secret: 'wrong-secret');

        $this->assertFalse((new PaddleSignatureVerifier())->verify($request));
    }

    public function test_a_tampered_body_is_rejected(): void
    {
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp.':{"event_type":"subscription.updated"}', self::SECRET);

        $request = Request::create('/webhooks/paddle', 'POST', content: '{"event_type":"subscription.canceled"}', server: [
            'HTTP_PADDLE_SIGNATURE' => "ts={$timestamp};h1={$signature}",
        ]);

        $this->assertFalse((new PaddleSignatureVerifier())->verify($request));
    }

    public function test_an_expired_timestamp_is_rejected(): void
    {
        $request = $this->signedRequest('{"event_type":"subscription.updated"}', timestamp: time() - 3600);

        $this->assertFalse((new PaddleSignatureVerifier())->verify($request));
    }

    public function test_a_missing_signature_header_is_rejected(): void
    {
        $request = Request::create('/webhooks/paddle', 'POST', content: '{}');

        $this->assertFalse((new PaddleSignatureVerifier())->verify($request));
    }
}
