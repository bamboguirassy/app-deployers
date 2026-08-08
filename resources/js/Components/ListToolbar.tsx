import { Button, Input, Select, Space } from 'antd';
import { ArrowUpDown, RotateCcw, Search } from 'lucide-react';
import { ReactNode } from 'react';

export interface FilterOption {
    key: string;
    placeholder: string;
    options: { value: string; label: string }[];
    width?: number;
    icon?: ReactNode;
}

export interface SortOption {
    value: string;
    label: string;
}

function chipLabel(icon: ReactNode, text: string, value: string) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {icon}
            {text} : {value}
        </span>
    );
}

export default function ListToolbar({
    search,
    onSearchChange,
    searchPlaceholder = 'Rechercher...',
    filters = [],
    filterValues,
    onFilterChange,
    sortOptions,
    sort,
    direction,
    onSortChange,
    onDirectionToggle,
    onReset,
    hasActiveFilters,
}: {
    search: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    filters?: FilterOption[];
    filterValues: Record<string, unknown>;
    onFilterChange: (key: string, value: string | null) => void;
    sortOptions?: SortOption[];
    sort?: string;
    direction?: 'asc' | 'desc';
    onSortChange?: (value: string) => void;
    onDirectionToggle?: () => void;
    onReset: () => void;
    hasActiveFilters?: boolean;
}) {
    return (
        <Space wrap size={12} style={{ marginBottom: 16, width: '100%' }}>
            <Input
                placeholder={searchPlaceholder}
                prefix={<Search size={14} />}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{ width: 240 }}
                allowClear
            />

            {filters.map((filter) => {
                const currentValue = filterValues[filter.key] as string | undefined;
                const currentLabel = filter.options.find((o) => o.value === currentValue)?.label ?? 'Tous';

                return (
                    <Select
                        key={filter.key}
                        allowClear
                        style={{ width: filter.width ?? 190 }}
                        value={currentValue}
                        options={filter.options}
                        placeholder={chipLabel(filter.icon, filter.placeholder, 'Tous')}
                        labelRender={() => chipLabel(filter.icon, filter.placeholder, currentLabel)}
                        onChange={(value) => onFilterChange(filter.key, value ?? null)}
                    />
                );
            })}

            {sortOptions && (
                <Select
                    style={{ width: 210 }}
                    value={sort}
                    options={sortOptions}
                    labelRender={(option) => chipLabel(<ArrowUpDown size={14} />, 'Trier', String(option.label ?? ''))}
                    onChange={onSortChange}
                />
            )}

            {sortOptions && (
                <Button
                    icon={<ArrowUpDown size={14} style={{ transform: direction === 'asc' ? 'scaleY(-1)' : undefined }} />}
                    onClick={onDirectionToggle}
                    title={direction === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'}
                />
            )}

            {hasActiveFilters && (
                <Button icon={<RotateCcw size={14} />} onClick={onReset}>
                    Réinitialiser
                </Button>
            )}
        </Space>
    );
}
