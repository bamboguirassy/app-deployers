import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import { buildDeployOptions, deployOptionRoute } from '@/lib/deployOptions';
import { Application } from '@/types/models';
import { router } from '@inertiajs/react';
import { Modal, Select } from 'antd';
import { useState } from 'react';

export type DeployableApplication = Pick<Application, 'id' | 'name' | 'slug' | 'targets'>;

export default function NewDeploymentModal({
    workspaceSlug,
    applications,
    open,
    onClose,
    onDeployed,
}: {
    workspaceSlug: string;
    applications: DeployableApplication[];
    open: boolean;
    onClose: () => void;
    onDeployed?: () => void;
}) {
    const [applicationId, setApplicationId] = useState<number | null>(null);
    const [target, setTarget] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const application = applications.find((a) => a.id === applicationId) ?? null;
    const options = application ? buildDeployOptions(application) : [];

    const reset = () => {
        setApplicationId(null);
        setTarget(null);
    };

    const submit = () => {
        if (!application || !target) return;

        setSubmitting(true);
        router.post(
            deployOptionRoute(workspaceSlug, application.slug, target),
            {},
            {
                onSuccess: () => onDeployed?.(),
                onFinish: () => {
                    setSubmitting(false);
                    reset();
                    onClose();
                },
            },
        );
    };

    return (
        <Modal
            title="Nouveau déploiement"
            open={open}
            onCancel={() => {
                reset();
                onClose();
            }}
            onOk={submit}
            okText="Déployer"
            okButtonProps={{ disabled: !target, loading: submitting }}
            destroyOnClose
        >
            <div className="form-stack">
                <div>
                    <InputLabel value="Application" />
                    <Select
                        className="w-full"
                        placeholder="Choisir une application"
                        showSearch
                        optionFilterProp="label"
                        value={applicationId ?? undefined}
                        onChange={(value) => {
                            setApplicationId(value);
                            setTarget(null);
                        }}
                        options={applications.map((a) => ({ value: a.id, label: a.name }))}
                    />
                </div>

                <div>
                    <InputLabel value="Target / Environnement" />
                    <Select
                        className="w-full"
                        placeholder={application ? 'Choisir une cible' : "Choisissez d'abord une application"}
                        disabled={!application}
                        value={target ?? undefined}
                        onChange={setTarget}
                        options={options.map((o) => ({ value: o.value, label: o.label }))}
                    />
                    {application && options.length === 0 && (
                        <p className="section-hint" style={{ marginTop: 4 }}>
                            Aucun target/environnement configuré pour cette application.
                        </p>
                    )}
                </div>
            </div>
        </Modal>
    );
}
