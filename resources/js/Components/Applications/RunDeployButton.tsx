import PrimaryButton from '@/Components/PrimaryButton';
import { buildDeployOptions, deployOptionRoute } from '@/lib/deployOptions';
import { PageProps } from '@/types';
import { Application } from '@/types/models';
import { router, usePage } from '@inertiajs/react';
import { Dropdown, Tooltip, type MenuProps } from 'antd';
import { ChevronDown, Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function RunDeployButton({ application }: { application: Application }) {
    const { t } = useTranslation('applications');
    const { workspace } = usePage<PageProps>().props;
    const options = buildDeployOptions(application);

    const items: MenuProps['items'] = options.map((option) => ({
        key: option.value,
        disabled: option.disabled,
        label: option.disabled ? (
            <Tooltip title={option.disabledReason} placement="left">
                <span>{option.label}</span>
            </Tooltip>
        ) : (
            option.label
        ),
        onClick: option.disabled
            ? undefined
            : () => router.post(deployOptionRoute(workspace!.slug, application.slug, option.value)),
    }));

    if (items.length === 0) {
        return (
            <Tooltip title={t('runDeployButton.configureFirstTooltip')}>
                <span>
                    <PrimaryButton htmlType="button" size="middle" icon={<Rocket size={14} />} className="run-deploy-btn" disabled>
                        {t('runDeployButton.runDeploy')}
                    </PrimaryButton>
                </span>
            </Tooltip>
        );
    }

    return (
        <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <PrimaryButton htmlType="button" size="middle" icon={<Rocket size={14} />} className="run-deploy-btn">
                {t('runDeployButton.runDeploy')}
                <ChevronDown size={14} />
            </PrimaryButton>
        </Dropdown>
    );
}
