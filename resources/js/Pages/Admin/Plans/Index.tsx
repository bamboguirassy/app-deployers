import AdminLayout from '@/Layouts/AdminLayout';
import { useConfirm } from '@/theme/ConfirmContext';
import { AdminPlan } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Button, Card, Checkbox, Col, InputNumber, Row, Typography } from 'antd';
import { useState } from 'react';

const { Title, Paragraph } = Typography;

/**
 * Une carte par plan, édition des deux seules limites numériques
 * (max_applications / max_concurrent_deployments) — pas de création /
 * suppression de plan dans cette itération, name/slug/prix Paddle restent en
 * lecture seule.
 */
function PlanCard({ plan }: { plan: AdminPlan }) {
    const confirm = useConfirm();

    const { data, setData, patch, processing } = useForm({
        max_applications: plan.max_applications,
        max_concurrent_deployments: plan.max_concurrent_deployments,
    });

    // Dernière valeur numérique connue pour chaque champ, utilisée pour
    // restaurer une valeur sensée quand on décoche "Illimité" plutôt que de
    // retomber bêtement sur 0.
    const [lastAppsValue, setLastAppsValue] = useState<number>(plan.max_applications ?? 0);
    const [lastConcurrentValue, setLastConcurrentValue] = useState<number>(plan.max_concurrent_deployments ?? 0);

    const submit = () => {
        const lowersBelowCurrentUsage =
            data.max_applications !== null &&
            data.max_applications !== undefined &&
            data.max_applications < plan.max_applications_in_use;

        const doSubmit = () => patch(route('admin.plans.update', plan.id));

        if (lowersBelowCurrentUsage) {
            confirm.confirm({
                title: 'Limite inférieure à l\'usage actuel',
                content:
                    "Cette limite est inférieure à l'usage actuel d'au moins un workspace sur ce plan — les workspaces concernés ne pourront plus créer d'application tant qu'ils ne repassent pas sous la limite, mais rien ne sera supprimé automatiquement. Continuer ?",
                okText: 'Continuer',
                cancelText: 'Annuler',
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
                {plan.workspaces_count} workspace(s) sur ce plan · usage max actuel constaté : {plan.max_applications_in_use} application(s)
            </Paragraph>

            <div className="form-stack">
                <div>
                    <label className="admin-field-label">Nombre d'applications max</label>
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
                            Illimité
                        </Checkbox>
                    </div>
                </div>

                <div>
                    <label className="admin-field-label">Déploiements concurrents max</label>
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
                            Illimité
                        </Checkbox>
                    </div>
                </div>

                <div className="form-actions form-actions--end">
                    <Button type="primary" loading={processing} onClick={submit}>
                        Enregistrer
                    </Button>
                </div>
            </div>
        </Card>
    );
}

export default function Index({ plans }: { plans: AdminPlan[] }) {
    return (
        <AdminLayout breadcrumbs={[{ label: 'Administration', href: route('admin.dashboard') }, { label: 'Plans' }]}>
            <Head title="Administration — Plans" />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">Limites & quotas</div>
                    <Title level={2} style={{ margin: 0 }}>
                        Plans
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        Édition des limites de quota par plan. La création/suppression de plan et les tarifs Paddle ne
                        sont pas gérés ici.
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
