<?php

namespace App\StepActions;

use App\Models\DeploymentStep;
use App\Models\TargetEnvironment;
use App\Support\TemplateInterpolator;
use Illuminate\Support\Facades\Mail;
use phpseclib3\Net\SSH2;
use Throwable;

class EmailStepAction implements StepActionContract
{
    public static function type(): string
    {
        return 'email';
    }

    public static function rules(): array
    {
        return [
            'to' => ['required', 'array', 'min:1'],
            'to.*' => ['required', 'email'],
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:10000'],
        ];
    }

    public function execute(
        DeploymentStep $step,
        TargetEnvironment $targetEnvironment,
        array $env,
        array $context,
        ?SSH2 $ssh,
        string $cancelKey,
        int $timeoutSeconds,
        ?callable $onOutput = null,
    ): StepExecutionResult {
        $config = $step->config_snapshot ?? [];
        $to = $config['to'] ?? [];
        $subject = TemplateInterpolator::render((string) ($config['subject'] ?? ''), $context);
        $body = TemplateInterpolator::render((string) ($config['body'] ?? ''), $context);

        try {
            Mail::html(nl2br(e($body)), function ($message) use ($to, $subject) {
                $message->to($to)->subject($subject);
            });

            return new StepExecutionResult(
                'Email envoyé à : '.implode(', ', $to)."\nObjet : {$subject}",
                0,
            );
        } catch (Throwable $e) {
            return new StepExecutionResult("Échec de l'envoi de l'email : ".$e->getMessage(), 1);
        }
    }
}
