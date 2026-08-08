import { Framework } from '@/types/models';
import { Select } from 'antd';
import { Boxes } from 'lucide-react';
import { useState } from 'react';

function FrameworkLogo({ src }: { src?: string | null }) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return <Boxes size={14} />;
    }

    return <img src={src} alt="" width={16} height={16} onError={() => setFailed(true)} />;
}

export default function FrameworkSelect({
    id,
    frameworks,
    value,
    onChange,
}: {
    id?: string;
    frameworks: Framework[];
    value: number | null;
    onChange: (value: number | null) => void;
}) {
    const options = frameworks.map((f) => ({ value: f.id, label: f.name, logo: f.logo_url }));

    return (
        <Select
            id={id}
            className="w-full"
            placeholder="Choisir un framework..."
            showSearch
            allowClear
            optionFilterProp="label"
            value={value ?? undefined}
            onChange={(v) => onChange(v ?? null)}
            options={options}
            optionRender={(option) => (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FrameworkLogo src={option.data.logo} />
                    {option.data.label}
                </span>
            )}
            labelRender={(option) => {
                const f = options.find((o) => o.value === option.value);
                return (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {f && <FrameworkLogo src={f.logo} />}
                        {option.label}
                    </span>
                );
            }}
        />
    );
}
