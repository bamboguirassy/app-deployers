import FrameworkSelect from '@/Components/Applications/FrameworkSelect';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import { PageProps } from '@/types';
import { Application, Framework } from '@/types/models';
import { useForm, usePage } from '@inertiajs/react';
import { Input, Modal } from 'antd';
import { FormEventHandler } from 'react';

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
        <Modal title="Nouveau target" open={open} onCancel={onClose} footer={null} destroyOnClose>
            <form onSubmit={submit} className="form-stack">
                <div>
                    <InputLabel htmlFor="framework" value="Framework / stack" />
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
                    <InputLabel htmlFor="name" value="Nom du target" />
                    <Input
                        id="name"
                        placeholder="ex: Backend, Frontend, Worker..."
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                    />
                    {errors.name && <div className="field-error">{errors.name}</div>}
                </div>

                <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                    <PrimaryButton disabled={processing}>Créer</PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
