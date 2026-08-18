import AdminLayout from '@/Layouts/AdminLayout';
import { useConfirm } from '@/theme/ConfirmContext';
import { AdminPlan } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Button, Card, Checkbox, Col, InputNumber, Row, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

/**
 * Une carte par plan, édition des deux seules limites numériques
 * (max_applications / max_concurrent_deployments) — pas de création /
 * suppression de plan dans cette itération, name/slug/prix Paddle restent en
 * lecture seule.
 */
function PlanCard({ plan }: { plan: AdminPlan }) {
    const { t } = useTranslation('admin');
    const confirm = useConfirm();

    const { data, setData, patch, processing } = useForm({
        max_applications: plan.max_applications,
        max_concurrent_deployments: plan.max_concurrent_deployments,
        max_workspaces: plan.max_workspaces,
    });

    // Dernière valeur numérique connue pour chaque champ, utilisée pour
    // restaurer une valeur sensée quand on décoche "Illimité" plutôt que de
    // retomber bêtement sur 0.
    const [lastAppsValue, setLastAppsValue] = useState<number>(plan.max_applications ?? 0);
    const [lastConcurrentValue, setLastConcurrentValue] = useState<number>(plan.max_concurrent_deployments ?? 0);
    const [lastWorkspacesValue, setLastWorkspacesValue] = useState<number>(plan.max_workspaces ?? 1);

    const submit = () => {
        const lowersBelowCurrentUsage =
            data.max_applications !== null &&
            data.max_applications !== undefined &&
            data.max_applications < plan.max_applications_in_use;

        const doSubmit = () => patch(route('admin.plans.update', plan.id));

        if (lowersBelowCurrentUsage) {
            confirm.confirm({
                title: t('plans.confirmLowerLimit.title'),
                content: t('plans.confirmLowerLimit.content'),
                okText: t('plans.confirmLowerLimit.okText'),
                cancelText: t('plans.confirmLowerLimit.cancelText'),
                okType: 'danger',
                onOk: doSubmit,
            });
        } else {
            doSubmit();
        }
    };

    return (
        <Card title={plan.name} className="premium-table-card">
            <Paragraph type="secondary" style={{ marginTop: -8 }}>
                {t('plans.usageSummary', {
                    workspacesCount: plan.workspaces_count,
                    maxApplicationsInUse: plan.max_applications_in_use,
                })}
            </Paragraph>

            <div className="form-stack">
                <div>
                    <label className="admin-field-label">{t('plans.maxApplicationsLabel')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <InputNumber
                            className="w-full"
                            min={0}
                            disabled={data.max_applications === null}
                            value={data.max_applications ?? undefined}
                            onChange={(value) => {
                                const numeric = value ?? 0;
                                setData('max_applications', numeric);
                                setLastAppsValue(numeric);
                            }}
                        />
                        <Checkbox
                            checked={data.max_applications === null}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setData('max_applications', null);
                                } else {
                                    setData('max_applications', lastAppsValue);
                                }
                            }}
                        >
                            {t('plans.unlimited')}
                        </Checkbox>
                    </div>
                </div>

                <div>
                    <label className="admin-field-label">{t('plans.maxWorkspacesLabel')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <InputNumber
                            className="w-full"
                            min={1}
                            disabled={data.max_workspaces === null}
                            value={data.max_workspaces ?? undefined}
                            onChange={(value) => {
                                const numeric = value ?? 1;
                                setData('max_workspaces', numeric);
                                setLastWorkspacesValue(numeric);
                            }}
                        />
                        <Checkbox
                            checked={data.max_workspaces === null}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setData('max_workspaces', null);
                                } else {
                                    setData('max_workspaces', lastWorkspacesValue);
                                }
                            }}
                        >
                            {t('plans.unlimited')}
                        </Checkbox>
                    </div>
                </div>

                <div>
                    <label className="admin-field-label">{t('plans.maxConcurrentDeploymentsLabel')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <InputNumber
                            className="w-full"
                            min={0}
                            disabled={data.max_concurrent_deployments === null}
                            value={data.max_concurrent_deployments ?? undefined}
                            onChange={(value) => {
                                const numeric = value ?? 0;
                                setData('max_concurrent_deployments', numeric);
                                setLastConcurrentValue(numeric);
                            }}
                        />
                        <Checkbox
                            checked={data.max_concurrent_deployments === null}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setData('max_concurrent_deployments', null);
                                } else {
                                    setData('max_concurrent_deployments', lastConcurrentValue);
                                }
                            }}
                        >
                            {t('plans.unlimited')}
                        </Checkbox>
                    </div>
                </div>

                <div className="form-actions form-actions--end">
                    <Button type="primary" loading={processing} onClick={submit}>
                        {t('plans.save')}
                    </Button>
                </div>
            </div>
        </Card>
    );
}

export default function Index({ plans }: { plans: AdminPlan[] }) {
    const { t } = useTranslation('admin');

    return (
        <AdminLayout breadcrumbs={[{ label: t('layout.breadcrumbFallback'), href: route('admin.dashboard') }, { label: t('layout.nav.plans') }]}>
            <Head title={t('plans.title')} />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">{t('plans.eyebrow')}</div>
                    <Title level={2} style={{ margin: 0 }}>
                        {t('plans.heading')}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        {t('plans.subtitle')}
                    </Paragraph>
                </div>
            </div>

            <Row gutter={[16, 16]}>
                {plans.map((plan) => (
                    <Col xs={24} md={12} key={plan.id}>
                        <PlanCard plan={plan} />
                    </Col>
                ))}
            </Row>
        </AdminLayout>
    );
}
