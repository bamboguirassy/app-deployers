import { Application } from '@/types/models';
import { Link } from '@inertiajs/react';
import { Avatar, Dropdown, type MenuProps } from 'antd';
import { Boxes, Check, ChevronDown, LayoutGrid, Plus } from 'lucide-react';

export default function ApplicationSwitcher({
    workspaceSlug,
    current,
    applications,
    canCreate,
}: {
    workspaceSlug: string;
    current: Application;
    applications: Pick<Application, 'id' | 'name' | 'slug' | 'logo_url'>[];
    canCreate: boolean;
}) {
    const items: MenuProps['items'] = [
        ...applications.map((app) => ({
            key: `app-${app.slug}`,
            label: (
                <Link href={route('applications.show', [workspaceSlug, app.slug])} className="app-switcher-menu__item">
                    <Avatar size={20} src={app.logo_url ?? undefined} icon={!app.logo_url && <Boxes size={11} />} shape="square" />
                    <span>{app.name}</span>
                </Link>
            ),
            icon: app.id === current.id ? <Check size={14} /> : <span style={{ width: 14, display: 'inline-block' }} />,
        })),
        { type: 'divider' as const },
        {
            key: 'all-applications',
            icon: <LayoutGrid size={14} />,
            label: <Link href={route('applications.index', workspaceSlug)}>Toutes les applications</Link>,
        },
        ...(canCreate
            ? [
                  {
                      key: 'create-application',
                      icon: <Plus size={14} />,
                      label: <Link href={route('applications.create', workspaceSlug)}>Nouvelle application</Link>,
                  },
              ]
            : []),
    ];

    return (
        <Dropdown menu={{ items }} trigger={['click']} placement="bottomLeft" getPopupContainer={() => document.body}>
            <button type="button" className="app-switcher__trigger" aria-label="Changer d'application">
                <span className="app-switcher__name">{current.name}</span>
                <ChevronDown size={14} />
            </button>
        </Dropdown>
    );
}
