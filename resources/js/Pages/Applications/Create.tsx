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
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

export default function Create() {
    const { t } = useTranslation('applications');
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
        <AuthenticatedLayout header={t('create.title')}>
            <Head title={t('create.title')} />

            <Card style={{ maxWidth: 560 }}>
                <Title level={5} style={{ marginTop: 0 }}>
                    {t('create.cardTitle')}
                </Title>
                <Paragraph type="secondary">
                    {t('create.cardDescription')}
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
                            aria-label={t('create.logoAriaLabel')}
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
                            <InputLabel value={t('create.logoLabel')} />
                            <span className="section-hint">{t('create.logoHint')}</span>
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
                        <InputLabel htmlFor="name" value={t('create.nameLabel')} />
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
                        <InputLabel htmlFor="description" value={t('create.descriptionLabel')} />
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
                            {t('create.submit')}
                        </PrimaryButton>
                    </div>
                </form>
            </Card>
        </AuthenticatedLayout>
    );
}
