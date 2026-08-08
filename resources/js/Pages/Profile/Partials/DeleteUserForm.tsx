import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { Modal } from 'antd';
import { FormEventHandler, useRef, useState } from 'react';

export default function DeleteUserForm({
    className = '',
}: {
    className?: string;
}) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser: FormEventHandler = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);

        clearErrors();
        reset();
    };

    return (
        <section className={className}>
            <header>
                <h2 className="section-title">Supprimer le compte</h2>
                <p className="section-hint">
                    Une fois votre compte supprimé, toutes ses ressources et
                    données seront définitivement effacées. Téléchargez ce
                    que vous souhaitez conserver avant de continuer.
                </p>
            </header>

            <div style={{ marginTop: 16 }}>
                <DangerButton onClick={confirmUserDeletion}>
                    Supprimer le compte
                </DangerButton>
            </div>

            <Modal
                open={confirmingUserDeletion}
                onCancel={closeModal}
                footer={null}
                title="Êtes-vous sûr de vouloir supprimer votre compte ?"
                destroyOnHidden
            >
                <form onSubmit={deleteUser}>
                    <p className="section-hint">
                        Cette action est irréversible. Merci de saisir votre
                        mot de passe pour confirmer.
                    </p>

                    <div style={{ marginTop: 16 }}>
                        <InputLabel
                            htmlFor="password"
                            value="Mot de passe"
                            className="sr-only"
                        />

                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) =>
                                setData('password', e.target.value)
                            }
                            className="w-full"
                            isFocused
                            placeholder="Mot de passe"
                        />

                        <InputError message={errors.password} />
                    </div>

                    <div className="form-actions form-actions--end" style={{ marginTop: 24 }}>
                        <SecondaryButton onClick={closeModal}>
                            Annuler
                        </SecondaryButton>

                        <DangerButton disabled={processing}>
                            Supprimer le compte
                        </DangerButton>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
