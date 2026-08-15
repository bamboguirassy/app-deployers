import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { PageProps } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

const COPY = {
    en: {
        title: 'Log in',
        email: 'Email address',
        password: 'Password',
        rememberMe: 'Remember me',
        forgotPassword: 'Forgot your password?',
        submit: 'Log in',
    },
    fr: {
        title: 'Se connecter',
        email: 'Adresse email',
        password: 'Mot de passe',
        rememberMe: 'Se souvenir de moi',
        forgotPassword: 'Mot de passe oublié ?',
        submit: 'Se connecter',
    },
};

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { locale } = usePage<PageProps>().props;
    const t = COPY[locale] ?? COPY.en;

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
            <Head title={t.title} />

            {status && <div className="form-status">{status}</div>}

            <form onSubmit={submit} className="form-stack">
                <div>
                    <InputLabel htmlFor="email" value={t.email} />

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
                    <InputLabel htmlFor="password" value={t.password} />

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
                    {t.rememberMe}
                </Checkbox>

                <div className="form-actions">
                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="form-link"
                        >
                            {t.forgotPassword}
                        </Link>
                    )}

                    <PrimaryButton disabled={processing}>
                        {t.submit}
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
