import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function UpdatePasswordForm({
    className = '',
}: {
    className?: string;
}) {
    const { t } = useTranslation('profile');
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
        recentlySuccessful,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <section className={className}>
            <header>
                <h2 className="section-title">{t('updatePassword.title')}</h2>
                <p className="section-hint">
                    {t('updatePassword.hint')}
                </p>
            </header>

            <form
                onSubmit={updatePassword}
                className="form-stack"
                style={{ marginTop: 24 }}
            >
                <div>
                    <InputLabel
                        htmlFor="current_password"
                        value={t('updatePassword.currentPasswordLabel')}
                    />

                    <TextInput
                        id="current_password"
                        ref={currentPasswordInput}
                        value={data.current_password}
                        onChange={(e) =>
                            setData('current_password', e.target.value)
                        }
                        type="password"
                        className="w-full"
                        autoComplete="current-password"
                    />

                    <InputError message={errors.current_password} />
                </div>

                <div>
                    <InputLabel htmlFor="password" value={t('updatePassword.newPasswordLabel')} />

                    <TextInput
                        id="password"
                        ref={passwordInput}
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        type="password"
                        className="w-full"
                        autoComplete="new-password"
                    />

                    <InputError message={errors.password} />
                </div>

                <div>
                    <InputLabel
                        htmlFor="password_confirmation"
                        value={t('updatePassword.confirmPasswordLabel')}
                    />

                    <TextInput
                        id="password_confirmation"
                        value={data.password_confirmation}
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        type="password"
                        className="w-full"
                        autoComplete="new-password"
                    />

                    <InputError message={errors.password_confirmation} />
                </div>

                <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
                    <PrimaryButton disabled={processing}>
                        {t('updatePassword.save')}
                    </PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="saved-hint">{t('updatePassword.saved')}</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
