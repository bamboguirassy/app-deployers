import { Button, ButtonProps } from 'antd';

export default function DangerButton({
    className = '',
    htmlType = 'submit',
    size = 'large',
    children,
    ...props
}: ButtonProps) {
    return (
        <Button
            danger
            type="primary"
            htmlType={htmlType}
            size={size}
            className={className}
            {...props}
        >
            {children}
        </Button>
    );
}
