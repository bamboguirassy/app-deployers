import { Link, usePage } from '@inertiajs/react';
import { Button, Card, Progress, Tooltip } from 'antd';
import { CheckCircle2, ChevronRight, Circle, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageProps } from '@/types';

export interface OnboardingData {
    has_server: boolean;
    has_application: boolean;
    has_target: boolean;
    has_environment: boolean;
    has_pipeline_step: boolean;
    has_deployment: boolean;
    first_application_slug: string | null;
}

interface SetupStep {
    key: string;
    done: boolean;
    titleKey: string;
    descriptionKey: string;
    href: string | null;
    linkLabelKey: string;
    requires: boolean;
}

export default function SetupChecklist({ onboarding }: { onboarding: OnboardingData }) {
    const { workspace } = usePage<PageProps>().props;
    const { t } = useTranslation('dashboard');

    const dismissKey = `onboarding_dismissed_${workspace?.slug}`;
    const [dismissed, setDismissed] = useState(() => {
        try {
            return localStorage.getItem(dismissKey) === '1';
        } catch {
            return false;
        }
    });
    const [celebrating, setCelebrating] = useState(false);

    const appSlug = onboarding.first_application_slug;

    const steps: SetupStep[] = useMemo(() => [
        {
            key: 'account',
            done: true,
            titleKey: 'onboarding.steps.account.title',
            descriptionKey: 'onboarding.steps.account.description',
            href: null,
            linkLabelKey: 'onboarding.steps.account.link',
            requires: true,
        },
        {
            key: 'server',
            done: onboarding.has_server,
            titleKey: 'onboarding.steps.server.title',
            descriptionKey: 'onboarding.steps.server.description',
            href: !onboarding.has_server ? route('servers.index', workspace!.slug) : null,
            linkLabelKey: 'onboarding.steps.server.link',
            requires: true,
        },
        {
            key: 'application',
            done: onboarding.has_application,
            titleKey: 'onboarding.steps.application.title',
            descriptionKey: 'onboarding.steps.application.description',
            href: !onboarding.has_application ? route('applications.create', workspace!.slug) : null,
            linkLabelKey: 'onboarding.steps.application.link',
            requires: true,
        },
        {
            key: 'target',
            done: onboarding.has_target,
            titleKey: 'onboarding.steps.target.title',
            descriptionKey: 'onboarding.steps.target.description',
            href: onboarding.has_application && !onboarding.has_target
                ? (appSlug ? route('applications.show', [workspace!.slug, appSlug]) : route('applications.index', workspace!.slug))
                : null,
            linkLabelKey: 'onboarding.steps.target.link',
            requires: onboarding.has_application,
        },
        {
            key: 'environment',
            done: onboarding.has_environment,
            titleKey: 'onboarding.steps.environment.title',
            descriptionKey: 'onboarding.steps.environment.description',
            href: onboarding.has_application && !onboarding.has_environment
                ? (appSlug ? route('applications.show', [workspace!.slug, appSlug]) : route('applications.index', workspace!.slug))
                : null,
            linkLabelKey: 'onboarding.steps.environment.link',
            requires: onboarding.has_application,
        },
        {
            key: 'pipeline',
            done: onboarding.has_pipeline_step,
            titleKey: 'onboarding.steps.pipeline.title',
            descriptionKey: 'onboarding.steps.pipeline.description',
            href: onboarding.has_target && !onboarding.has_pipeline_step
                ? (appSlug ? route('applications.show', [workspace!.slug, appSlug]) : route('applications.index', workspace!.slug))
                : null,
            linkLabelKey: 'onboarding.steps.pipeline.link',
            requires: onboarding.has_target,
        },
        {
            key: 'deployment',
            done: onboarding.has_deployment,
            titleKey: 'onboarding.steps.deployment.title',
            descriptionKey: 'onboarding.steps.deployment.description',
            href: onboarding.has_pipeline_step && !onboarding.has_deployment
                ? (appSlug ? route('applications.show', [workspace!.slug, appSlug]) : route('applications.index', workspace!.slug))
                : null,
            linkLabelKey: 'onboarding.steps.deployment.link',
            requires: onboarding.has_pipeline_step,
        },
    ], [onboarding, workspace, appSlug]);

    const doneCount = steps.filter((s) => s.done).length;
    const total = steps.length;
    const allDone = doneCount === total;

    useEffect(() => {
        if (allDone && !dismissed) {
            setCelebrating(true);
            const timer = setTimeout(() => {
                setDismissed(true);
                try { localStorage.setItem(dismissKey, '1'); } catch { /* noop */ }
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [allDone, dismissed, dismissKey]);

    const dismiss = useCallback(() => {
        setDismissed(true);
        try { localStorage.setItem(dismissKey, '1'); } catch { /* noop */ }
    }, [dismissKey]);

    if (dismissed) return null;

    return (
        <Card className="setup-checklist" style={{ marginBottom: 16 }}>
            <div className="setup-checklist__header">
                <div className="setup-checklist__header-text">
                    <span className="setup-checklist__title">
                        {celebrating ? t('onboarding.celebrationTitle') : t('onboarding.title')}
                    </span>
                    <span className="setup-checklist__subtitle">
                        {celebrating
                            ? t('onboarding.celebrationSubtitle')
                            : t('onboarding.subtitle', { done: doneCount, total })}
                    </span>
                </div>
                <div className="setup-checklist__header-actions">
                    <div className="setup-checklist__progress-wrap">
                        <Progress
                            type="circle"
                            percent={Math.round((doneCount / total) * 100)}
                            size={52}
                            strokeColor="var(--color-primary)"
                            format={() => `${doneCount}/${total}`}
                        />
                    </div>
                    <Tooltip title={t('onboarding.dismiss')}>
                        <Button
                            type="text"
                            size="small"
                            icon={<X size={14} />}
                            onClick={dismiss}
                            aria-label={t('onboarding.dismiss')}
                            className="setup-checklist__dismiss"
                        />
                    </Tooltip>
                </div>
            </div>

            <div className="setup-checklist__steps">
                {steps.map((step, idx) => {
                    const isLocked = !step.done && !step.requires;
                    const isNext = !step.done && step.requires && steps.slice(0, idx).every((s) => s.done);

                    return (
                        <div
                            key={step.key}
                            className={[
                                'setup-checklist__step',
                                step.done ? 'setup-checklist__step--done' : '',
                                isLocked ? 'setup-checklist__step--locked' : '',
                                isNext ? 'setup-checklist__step--next' : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                        >
                            <span className="setup-checklist__step-icon">
                                {step.done ? (
                                    <CheckCircle2 size={18} />
                                ) : (
                                    <Circle size={18} />
                                )}
                            </span>
                            <span className="setup-checklist__step-body">
                                <span className="setup-checklist__step-title">{t(step.titleKey)}</span>
                                <span className="setup-checklist__step-desc">{t(step.descriptionKey)}</span>
                            </span>
                            {step.href && !step.done && (
                                <Link href={step.href} className="setup-checklist__step-action">
                                    {t(step.linkLabelKey)} <ChevronRight size={13} />
                                </Link>
                            )}
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
