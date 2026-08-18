import FrameworkSelect from '@/Components/Applications/FrameworkSelect';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import { PageProps } from '@/types';
import { Application, Framework } from '@/types/models';
import { useForm, usePage } from '@inertiajs/react';
import { Input, Modal } from 'antd';
import { FormEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

export default function CreateTargetModal({
    application,
    frameworks,
    open,
    onClose,
    onCreated,
}: {
    application: Application;
    frameworks: Framework[];
    open: boolean;
    onClose: () => void;
    onCreated: (targetId: string) => void;
}) {
    const { t } = useTranslation('applications');
    const { workspace } = usePage<PageProps>().props;
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        framework_id: null as number | null,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('targets.store', [workspace!.slug, application.slug]), {
            onSuccess: (page) => {
                reset();
                onClose();
                const created = (page.props.application as Application).targets.at(-1);
                if (created) onCreated(created.uuid);
            },
        });
    };

    return (
        <Modal title={t('createTargetModal.title')} open={open} onCancel={onClose} footer={null} destroyOnClose>
            <form onSubmit={submit} className="form-stack">
                <div>
                    <InputLabel htmlFor="framework" value={t('createTargetModal.frameworkLabel')} />
                    <FrameworkSelect
                        id="framework"
                        frameworks={frameworks}
                        value={data.framework_id}
                        onChange={(value) => {
                            setData('framework_id', value);
                            const chosen = frameworks.find((f) => f.id === value);
                            if (chosen && !data.name) {
                                setData('name', chosen.name);
                            }
                        }}
                    />
                </div>
                <div>
                    <InputLabel htmlFor="name" value={t('createTargetModal.nameLabel')} />
                    <Input
                        id="name"
                        placeholder={t('createTargetModal.namePlaceholder')}
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                    />
                    {errors.name && <div className="field-error">{errors.name}</div>}
                </div>
                <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                    <PrimaryButton disabled={processing}>{t('createTargetModal.submit')}</PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
