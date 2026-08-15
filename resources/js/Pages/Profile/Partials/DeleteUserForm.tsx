import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { Modal } from 'antd';
import { FormEventHandler, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function DeleteUserForm({
    className = '',
}: {
    className?: string;
}) {
    const { t } = useTranslation('profile');
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
                <h2 className="section-title">{t('deleteUser.title')}</h2>
                <p className="section-hint">
                    {t('deleteUser.hint')}
                </p>
            </header>

            <div style={{ marginTop: 16 }}>
                <DangerButton onClick={confirmUserDeletion}>
                    {t('deleteUser.deleteButton')}
                </DangerButton>
            </div>

            <Modal
                open={confirmingUserDeletion}
                onCancel={closeModal}
                footer={null}
                title={t('deleteUser.modalTitle')}
                destroyOnHidden
            >
                <form onSubmit={deleteUser}>
                    <p className="section-hint">
                        {t('deleteUser.modalHint')}
                    </p>

                    <div style={{ marginTop: 16 }}>
                        <InputLabel
                            htmlFor="password"
                            value={t('deleteUser.passwordLabel')}
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
                            placeholder={t('deleteUser.passwordPlaceholder')}
                        />

                        <InputError message={errors.password} />
                    </div>

                    <div className="form-actions form-actions--end" style={{ marginTop: 24 }}>
                        <SecondaryButton onClick={closeModal}>
                            {t('deleteUser.cancel')}
                        </SecondaryButton>

                        <DangerButton disabled={processing}>
                            {t('deleteUser.confirmDelete')}
                        </DangerButton>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
