import PrimaryButton from '@/Components/PrimaryButton';
import { PageProps } from '@/types';
import { Application } from '@/types/models';
import { router, usePage } from '@inertiajs/react';
import { Dropdown, Tooltip } from 'antd';
import { ChevronDown, Rocket } from 'lucide-react';

export default function RunDeployButton({ application }: { application: Application }) {
    const { workspace } = usePage<PageProps>().props;
    const options = application.targets.flatMap((target) =>
        target.target_environments.map((te) => ({
            key: String(te.id),
            label: `${target.name} → ${te.environment.name}`,
            onClick: () => router.post(route('deployments.store', [workspace!.slug, application.slug, te.id])),
        })),
    );

    if (options.length === 0) {
        return (
            <Tooltip title="Configurez d'abord un couple target/environnement dans l'onglet Environnements">
                <span>
                    <PrimaryButton htmlType="button" size="middle" icon={<Rocket size={14} />} className="run-deploy-btn" disabled>
                        Run deploy
                    </PrimaryButton>
                </span>
            </Tooltip>
        );
    }

    return (
        <Dropdown menu={{ items: options }} trigger={['click']} placement="bottomRight">
            <PrimaryButton htmlType="button" size="middle" icon={<Rocket size={14} />} className="run-deploy-btn">
                Run deploy
                <ChevronDown size={14} />
            </PrimaryButton>
        </Dropdown>
    );
}
