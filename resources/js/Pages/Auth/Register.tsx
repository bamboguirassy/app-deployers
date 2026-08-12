import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from 'antd';
import { Check } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

export default function Register() {
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
            setError('name', 'Le nom est requis.');
            return;
        }

        if (!data.email.trim()) {
            setError('email', "L'email est requis.");
            return;
        }

        if (data.password.length < 8) {
            setError('password', 'Le mot de passe doit contenir au moins 8 caractères.');
            return;
        }

        if (data.password !== data.password_confirmation) {
            setError('password_confirmation', 'La confirmation ne correspond pas.');
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
            <Head title="Créer votre compte" />

            <div className="auth-steps">
                <div className={`auth-steps__item ${step === 1 ? 'is-active' : 'is-done'}`}>
                    <span className="auth-steps__dot">
                        {step === 1 ? '1' : <Check size={13} />}
                    </span>
                    Votre compte
                </div>
                <span className="auth-steps__sep" />
                <div className={`auth-steps__item ${step === 2 ? 'is-active' : ''}`}>
                    <span className="auth-steps__dot">2</span>
                    Votre workspace
                </div>
            </div>

            {step === 1 && (
                <form onSubmit={goToWorkspaceStep} className="form-stack">
                    <div>
                        <InputLabel htmlFor="name" value="Nom" />

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
                        <InputLabel htmlFor="email" value="Email" />

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
                        <InputLabel htmlFor="password" value="Mot de passe" />

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
                            value="Confirmer le mot de passe"
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
                            Déjà inscrit ?
                        </Link>

                        <PrimaryButton>Continuer</PrimaryButton>
                    </div>
                </form>
            )}

            {step === 2 && (
                <form onSubmit={submit} className="form-stack">
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
                        Un workspace regroupe vos applications, vos serveurs et les
                        membres de votre équipe. Vous pourrez en créer d&apos;autres
                        ensuite.
                    </p>

                    <div>
                        <InputLabel htmlFor="workspace_name" value="Nom du workspace" />

                        <TextInput
                            id="workspace_name"
                            name="workspace_name"
                            value={data.workspace_name}
                            className="w-full"
                            placeholder="ex : Mon entreprise au Sénégal"
                            isFocused
                            onChange={(e) => setData('workspace_name', e.target.value)}
                            required
                        />

                        <InputError message={errors.workspace_name} />
                    </div>

                    <div className="form-actions">
                        <Button type="text" onClick={() => setStep(1)}>
                            Retour
                        </Button>

                        <PrimaryButton disabled={processing}>
                            Créer mon workspace
                        </PrimaryButton>
                    </div>
                </form>
            )}
        </GuestLayout>
    );
}
