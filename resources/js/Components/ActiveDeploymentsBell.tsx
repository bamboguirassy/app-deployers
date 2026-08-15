import { ActiveDeploymentEntry, PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { Badge, Dropdown, Empty, Tooltip, Typography } from 'antd';
import { ArrowRight, Rocket } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

/**
 * Indicateur global des déploiements en cours (pending/running) pour le
 * workspace actif — visible depuis n'importe quelle page, pas seulement
 * depuis la liste ou le détail d'un déploiement. État initial fourni par le
 * prop Inertia partagé `activeDeployments` (HandleInertiaRequests), tenu à
 * jour ensuite en direct via le channel privé `workspace.{id}`.
 */
export default function ActiveDeploymentsBell() {
    const { workspace, activeDeployments } = usePage<PageProps>().props;
    const { t } = useTranslation('common');
    const [items, setItems] = useState<ActiveDeploymentEntry[]>(activeDeployments?.items ?? []);

    useEcho(
        workspace ? `workspace.${workspace.id}` : '',
        '.deploiement.statut',
        (payload: Omit<ActiveDeploymentEntry, 'id' | 'status'> & { deployment_id: number; statut: string }) => {
            const isActive = payload.statut === 'pending' || payload.statut === 'running';

            setItems((prev) => {
                const withoutThisOne = prev.filter((item) => item.id !== payload.deployment_id);

                if (!isActive) {
                    return withoutThisOne;
                }

                const entry: ActiveDeploymentEntry = {
                    id: payload.deployment_id,
                    status: payload.statut as 'pending' | 'running',
                    started_at: payload.started_at,
                    application_name: payload.application_name,
                    target_name: payload.target_name,
                    environment_name: payload.environment_name,
                    show_url: payload.show_url,
                    steps_total: payload.steps_total,
                    steps_done: payload.steps_done,
                };

                return [entry, ...withoutThisOne];
            });
        },
        [workspace?.id],
    );

    if (!workspace) {
        return null;
    }

    const menu = {
        items:
            items.length === 0
                ? [
                      {
                          key: 'empty',
                          disabled: true,
                          label: <Empty description={t('activeDeployments.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />,
                      },
                  ]
                : items.map((item) => ({
                      key: item.id,
                      label: (
                          <Link href={item.show_url} className="active-deployments-item">
                              <span className={`active-deployments-item__dot active-deployments-item__dot--${item.status}`} />
                              <span className="active-deployments-item__body">
                                  <Text strong>{item.application_name}</Text>
                                  <span className="active-deployments-item__meta">
                                      {item.target_name}
                                      <ArrowRight size={11} />
                                      {item.environment_name}
                                  </span>
                              </span>
                          </Link>
                      ),
                  })),
    };

    return (
        <Dropdown menu={menu} trigger={['click']} placement="bottomRight" getPopupContainer={() => document.body}>
            <Tooltip title={t('activeDeployments.title')}>
                <button
                    type="button"
                    className="app-shell__icon-btn active-deployments-trigger"
                    aria-label={t('activeDeployments.title')}
                >
                    <Badge count={items.length} size="small" offset={[-2, 2]}>
                        <Rocket size={18} />
                    </Badge>
                </button>
            </Tooltip>
        </Dropdown>
    );
}
