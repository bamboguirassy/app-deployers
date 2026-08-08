import PrimaryButton from '@/Components/PrimaryButton';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Email Verification" />

            <p className="field-label" style={{ marginBottom: 16 }}>
                Merci de votre inscription ! Avant de commencer, merci de
                vérifier votre adresse email via le lien que nous venons de
                vous envoyer.
            </p>

            {status === 'verification-link-sent' && (
                <div className="form-status" style={{ marginBottom: 16 }}>
                    Un nouveau lien de vérification a été envoyé à votre
                    adresse email.
                </div>
            )}

            <form onSubmit={submit} className="form-actions">
                <PrimaryButton disabled={processing}>
                    Renvoyer l&apos;email de vérification
                </PrimaryButton>

                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="form-link"
                >
                    Se déconnecter
                </Link>
            </form>
        </GuestLayout>
    );
}
