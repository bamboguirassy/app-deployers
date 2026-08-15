import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Se connecter" />

            {status && <div className="form-status">{status}</div>}

            <form onSubmit={submit} className="form-stack">
                <div>
                    <InputLabel htmlFor="email" value="Adresse email" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="w-full"
                        autoComplete="username"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                    />

                    <InputError message={errors.email} />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Mot de passe" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="w-full"
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                    />

                    <InputError message={errors.password} />
                </div>

                <Checkbox
                    name="remember"
                    checked={data.remember}
                    onChange={(e) => setData('remember', e.target.checked)}
                >
                    Se souvenir de moi
                </Checkbox>

                <div className="form-actions">
                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="form-link"
                        >
                            Mot de passe oublié ?
                        </Link>
                    )}

                    <PrimaryButton disabled={processing}>
                        Se connecter
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
