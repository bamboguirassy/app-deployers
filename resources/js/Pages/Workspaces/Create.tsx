import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { Typography } from 'antd';
import { FormEventHandler } from 'react';

const { Paragraph } = Typography;

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({ name: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('workspaces.store'));
    };

    return (
        <GuestLayout>
            <Head title="Nouveau workspace" />

            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                Un workspace regroupe vos applications, vos serveurs et les membres de votre
                équipe. Vous pourrez en créer d&apos;autres et basculer entre eux à tout moment.
            </Paragraph>

            <form onSubmit={submit} className="form-stack">
                <div>
                    <InputLabel htmlFor="name" value="Nom du workspace" />
                    <TextInput
                        id="name"
                        className="w-full"
                        placeholder="ex: Mon entreprise"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        isFocused
                        required
                    />
                    <InputError message={errors.name} />
                </div>

                <div className="form-actions form-actions--end">
                    <PrimaryButton disabled={processing}>Créer le workspace</PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
