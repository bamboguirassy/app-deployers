import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import { PageProps } from '@/types';
import { Application } from '@/types/models';
import { useForm, usePage } from '@inertiajs/react';
import { Avatar, Card, Input } from 'antd';
import { Boxes } from 'lucide-react';
import { FormEventHandler, useRef, useState } from 'react';

export default function ApplicationDetailsPanel({ application, canManage }: { application: Application; canManage: boolean }) {
    const { workspace } = usePage<PageProps>().props;
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const { data, setData, post, processing, errors, recentlySuccessful } = useForm<{
        name: string;
        description: string;
        logo: File | null;
    }>({
        name: application.name,
        description: application.description ?? '',
        logo: null,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('applications.update', [workspace!.slug, application.slug]), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setPreview(null),
        });
    };

    return (
        <Card title="Détails de l'application" style={{ maxWidth: 560 }}>
            <form onSubmit={submit} className="form-stack">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
                    <div
                        role={canManage ? 'button' : undefined}
                        tabIndex={canManage ? 0 : undefined}
                        aria-label={canManage ? 'Changer le logo' : undefined}
                        style={{ cursor: canManage ? 'pointer' : 'default' }}
                        onClick={() => canManage && logoInputRef.current?.click()}
                        onKeyDown={(e) => {
                            if (!canManage) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                logoInputRef.current?.click();
                            }
                        }}
                    >
                        <Avatar
                            size={64}
                            src={preview ?? application.logo_url ?? undefined}
                            icon={!preview && !application.logo_url && <Boxes size={24} />}
                            shape="square"
                        />
                    </div>
                    <div>
                        <InputLabel value="Logo" />
                        <span className="section-hint">{canManage ? "Cliquez sur l'icône pour la changer." : ''}</span>
                    </div>
                    {canManage && (
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                setData('logo', file);
                                setPreview(file ? URL.createObjectURL(file) : null);
                            }}
                        />
                    )}
                </div>

                <div>
                    <InputLabel htmlFor="app-name" value="Nom de l'application" />
                    <Input
                        id="app-name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        disabled={!canManage}
                    />
                    <InputError message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="app-description" value="Description" />
                    <Input.TextArea
                        id="app-description"
                        rows={3}
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        disabled={!canManage}
                    />
                    <InputError message={errors.description} />
                </div>

                {canManage && (
                    <div className="form-actions" style={{ justifyContent: 'flex-start', alignItems: 'center', gap: 12 }}>
                        <PrimaryButton disabled={processing}>Enregistrer</PrimaryButton>
                        {recentlySuccessful && <span className="saved-hint">Enregistré.</span>}
                    </div>
                )}
            </form>
        </Card>
    );
}
