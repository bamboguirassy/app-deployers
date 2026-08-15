import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Mot de passe oublié" />

            <p className="field-label" style={{ marginBottom: 16 }}>
                Mot de passe oublié ? Indiquez votre email et nous vous
                envoyons un lien de réinitialisation.
            </p>

            {status && <div className="form-status">{status}</div>}

            <form onSubmit={submit} className="form-stack">
                <div>
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="w-full"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                    />

                    <InputError message={errors.email} />
                </div>

                <div className="form-actions">
                    <Link href={route('login')} className="form-link">
                        Retour à la connexion
                    </Link>

                    <PrimaryButton disabled={processing}>
                        Envoyer le lien
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
