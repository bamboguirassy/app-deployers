import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}: {
    mustVerifyEmail: boolean;
    status?: string;
    className?: string;
}) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    return (
        <section className={className}>
            <header>
                <h2 className="section-title">Informations du profil</h2>
                <p className="section-hint">
                    Mettez à jour votre nom et votre adresse email.
                </p>
            </header>

            <form onSubmit={submit} className="form-stack" style={{ marginTop: 24 }}>
                <div>
                    <InputLabel htmlFor="name" value="Nom" />

                    <TextInput
                        id="name"
                        className="w-full"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        isFocused
                        autoComplete="name"
                    />

                    <InputError message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        className="w-full"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                    />

                    <InputError message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <p className="section-hint">
                            Votre adresse email n&apos;est pas vérifiée.{' '}
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="form-link"
                            >
                                Cliquez ici pour renvoyer l&apos;email de
                                vérification.
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="saved-hint" style={{ marginTop: 8 }}>
                                Un nouveau lien de vérification a été envoyé.
                            </div>
                        )}
                    </div>
                )}

                <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
                    <PrimaryButton disabled={processing}>
                        Enregistrer
                    </PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="saved-hint">Enregistré.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
