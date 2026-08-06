import { Button, Tooltip } from 'antd';
import { Moon, Sun } from 'lucide-react';
import { useThemeMode } from '@/theme/ThemeContext';

export default function ThemeToggle() {
    const { mode, toggle } = useThemeMode();
    const isDark = mode === 'dark';

    return (
        <Tooltip title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}>
            <Button
                type="text"
                shape="circle"
                aria-label="Changer de thème"
                onClick={toggle}
                icon={isDark ? <Sun size={18} /> : <Moon size={18} />}
            />
        </Tooltip>
    );
}
