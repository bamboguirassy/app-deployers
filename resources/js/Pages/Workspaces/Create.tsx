import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { Typography } from 'antd';
import { FormEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

const { Paragraph } = Typography;

export default function Create() {
    const { t } = useTranslation('workspaces');
    const { data, setData, post, processing, errors } = useForm({ name: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('workspaces.store'));
    };

    return (
        <GuestLayout>
            <Head title={t('create.title')} />

            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                {t('create.description')}
            </Paragraph>

            <form onSubmit={submit} className="form-stack">
                <div>
                    <InputLabel htmlFor="name" value={t('create.nameLabel')} />
                    <TextInput
                        id="name"
                        className="w-full"
                        placeholder={t('create.namePlaceholder')}
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        isFocused
                        required
                    />
                    <InputError message={errors.name} />
                </div>

                <div className="form-actions form-actions--end">
                    <PrimaryButton disabled={processing}>{t('create.submit')}</PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
