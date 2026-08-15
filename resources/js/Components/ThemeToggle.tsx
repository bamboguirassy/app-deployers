import { Button, Tooltip } from 'antd';
import { Moon, Sun } from 'lucide-react';
import { useThemeMode } from '@/theme/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function ThemeToggle() {
    const { mode, toggle } = useThemeMode();
    const { t } = useTranslation('common');
    const isDark = mode === 'dark';

    return (
        <Tooltip title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}>
            <Button
                type="text"
                shape="circle"
                aria-label={t('theme.toggle')}
                onClick={toggle}
                icon={isDark ? <Sun size={18} /> : <Moon size={18} />}
            />
        </Tooltip>
    );
}
