import { createContext, useContext } from 'react';
import type { Modal } from 'antd';

type ModalStaticFunctions = ReturnType<typeof Modal.useModal>[0];

export const ConfirmContext = createContext<ModalStaticFunctions | null>(null);

export function useConfirm(): ModalStaticFunctions {
    const context = useContext(ConfirmContext);

    if (!context) {
        throw new Error('useConfirm must be used within an AppThemeProvider');
    }

    return context;
}
