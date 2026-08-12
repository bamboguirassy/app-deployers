import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Alert, Avatar, Card, Input, Typography } from 'antd';
import { Boxes } from 'lucide-react';
import { FormEventHandler, useRef, useState } from 'react';

const { Title, Paragraph } = Typography;

export default function Create() {
    const { workspace, flash } = usePage<PageProps>().props;
    const [preview, setPreview] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const { data, setData, post, processing, errors } = useForm<{
        name: string;
        description: string;
        logo: File | null;
    }>({
        name: '',
        description: '',
        logo: null,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('applications.store', workspace!.slug), { forceFormData: true });
    };

    return (
        <AuthenticatedLayout header="Nouvelle application">
            <Head title="Nouvelle application" />

            <Card style={{ maxWidth: 560 }}>
                <Title level={5} style={{ marginTop: 0 }}>
                    Créer une application
                </Title>
                <Paragraph type="secondary">
                    Vous pourrez ensuite définir ses targets (tiers), son
                    pipeline de déploiement et ses environnements.
                </Paragraph>

                {flash?.error && (
                    <Alert
                        type="error"
                        message={flash.error}
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}

                <form onSubmit={submit} className="form-stack">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                            role="button"
                            tabIndex={0}
                            aria-label="Choisir un logo"
                            style={{ cursor: 'pointer' }}
                            onClick={() => logoInputRef.current?.click()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    logoInputRef.current?.click();
                                }
                            }}
                        >
                            <Avatar
                                size={56}
                                src={preview ?? undefined}
                                icon={!preview && <Boxes size={24} />}
                                shape="square"
                                style={{ borderRadius: 10 }}
                            />
                        </div>
                        <div>
                            <InputLabel value="Logo (optionnel)" />
                            <span className="section-hint">Cliquez sur l&apos;icône pour choisir une image.</span>
                        </div>
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
                    </div>

                    <div>
                        <InputLabel htmlFor="name" value="Nom de l'application" />
                        <TextInput
                            id="name"
                            className="w-full"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            isFocused
                            required
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div>
                        <InputLabel htmlFor="description" value="Description (optionnel)" />
                        <Input.TextArea
                            id="description"
                            rows={3}
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                        />
                        <InputError message={errors.description} />
                    </div>

                    <div className="form-actions form-actions--end">
                        <PrimaryButton disabled={processing}>
                            Créer l&apos;application
                        </PrimaryButton>
                    </div>
                </form>
            </Card>
        </AuthenticatedLayout>
    );
}
