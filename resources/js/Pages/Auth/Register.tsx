import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { PageProps } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Button } from 'antd';
import { Check } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

const COPY = {
    en: {
        title: 'Create your account',
        stepAccount: 'Your account',
        stepWorkspace: 'Your workspace',
        name: 'Name',
        email: 'Email address',
        password: 'Password',
        confirmPassword: 'Confirm password',
        alreadyRegistered: 'Already registered?',
        continue: 'Continue',
        workspaceIntro:
            "A workspace groups your applications, servers and team members. You'll be able to create more later.",
        workspaceName: 'Workspace name',
        workspaceNamePlaceholder: 'e.g. My company',
        back: 'Back',
        createWorkspace: 'Create my workspace',
        errors: {
            name: 'Name is required.',
            email: 'Email is required.',
            passwordLength: 'Password must be at least 8 characters.',
            passwordConfirmation: "Confirmation doesn't match.",
        },
    },
    fr: {
        title: 'Créer votre compte',
        stepAccount: 'Votre compte',
        stepWorkspace: 'Votre workspace',
        name: 'Nom',
        email: 'Adresse email',
        password: 'Mot de passe',
        confirmPassword: 'Confirmer le mot de passe',
        alreadyRegistered: 'Déjà inscrit ?',
        continue: 'Continuer',
        workspaceIntro:
            "Un workspace regroupe vos applications, vos serveurs et les membres de votre équipe. Vous pourrez en créer d'autres ensuite.",
        workspaceName: 'Nom du workspace',
        workspaceNamePlaceholder: 'ex : Mon entreprise',
        back: 'Retour',
        createWorkspace: 'Créer mon workspace',
        errors: {
            name: 'Le nom est requis.',
            email: "L'email est requis.",
            passwordLength: 'Le mot de passe doit contenir au moins 8 caractères.',
            passwordConfirmation: 'La confirmation ne correspond pas.',
        },
    },
};

export default function Register() {
    const { locale } = usePage<PageProps>().props;
    const t = COPY[locale] ?? COPY.en;
    const [step, setStep] = useState<1 | 2>(1);

    const { data, setData, post, processing, errors, reset, setError, clearErrors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        workspace_name: '',
    });

    const goToWorkspaceStep: FormEventHandler = (e) => {
        e.preventDefault();
        clearErrors();

        if (!data.name.trim()) {
            setError('name', t.errors.name);
            return;
        }

        if (!data.email.trim()) {
            setError('email', t.errors.email);
            return;
        }

        if (data.password.length < 8) {
            setError('password', t.errors.passwordLength);
            return;
        }

        if (data.password !== data.password_confirmation) {
            setError('password_confirmation', t.errors.passwordConfirmation);
            return;
        }

        setStep(2);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onError: (submitErrors) => {
                if (submitErrors.name || submitErrors.email || submitErrors.password) {
                    setStep(1);
                }
            },
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout wide>
            <Head title={t.title} />

            <div className="auth-steps">
                <div className={`auth-steps__item ${step === 1 ? 'is-active' : 'is-done'}`}>
                    <span className="auth-steps__dot">
                        {step === 1 ? '1' : <Check size={13} />}
                    </span>
                    {t.stepAccount}
                </div>
                <span className="auth-steps__sep" />
                <div className={`auth-steps__item ${step === 2 ? 'is-active' : ''}`}>
                    <span className="auth-steps__dot">2</span>
                    {t.stepWorkspace}
                </div>
            </div>

            {step === 1 && (
                <form onSubmit={goToWorkspaceStep} className="form-stack">
                    <div>
                        <InputLabel htmlFor="name" value={t.name} />

                        <TextInput
                            id="name"
                            name="name"
                            value={data.name}
                            className="w-full"
                            autoComplete="name"
                            isFocused={true}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />

                        <InputError message={errors.name} />
                    </div>

                    <div>
                        <InputLabel htmlFor="email" value={t.email} />

                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="w-full"
                            autoComplete="username"
                            onChange={(e) => setData('email', e.target.value)}
                            required
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
                            autoComplete="new-password"
                            onChange={(e) => setData('password', e.target.value)}
                            required
                        />

                        <InputError message={errors.password} />
                    </div>

                    <div>
                        <InputLabel
                            htmlFor="password_confirmation"
                            value={t.confirmPassword}
                        />

                        <TextInput
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="w-full"
                            autoComplete="new-password"
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            required
                        />

                        <InputError message={errors.password_confirmation} />
                    </div>

                    <div className="form-actions">
                        <Link href={route('login')} className="form-link">
                            {t.alreadyRegistered}
                        </Link>

                        <PrimaryButton>{t.continue}</PrimaryButton>
                    </div>
                </form>
            )}

            {step === 2 && (
                <form onSubmit={submit} className="form-stack">
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
                        {t.workspaceIntro}
                    </p>

                    <div>
                        <InputLabel htmlFor="workspace_name" value={t.workspaceName} />

                        <TextInput
                            id="workspace_name"
                            name="workspace_name"
                            value={data.workspace_name}
                            className="w-full"
                            placeholder={t.workspaceNamePlaceholder}
                            isFocused
                            onChange={(e) => setData('workspace_name', e.target.value)}
                            required
                        />

                        <InputError message={errors.workspace_name} />
                    </div>

                    <div className="form-actions">
                        <Button type="text" onClick={() => setStep(1)}>
                            {t.back}
                        </Button>

                        <PrimaryButton disabled={processing}>
                            {t.createWorkspace}
                        </PrimaryButton>
                    </div>
                </form>
            )}
        </GuestLayout>
    );
}
