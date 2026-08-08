import { Button, ButtonProps } from 'antd';

export default function SecondaryButton({
    htmlType = 'button',
    className = '',
    size = 'large',
    children,
    ...props
}: ButtonProps) {
    return (
        <Button
            htmlType={htmlType}
            size={size}
            className={className}
            {...props}
        >
            {children}
        </Button>
    );
}
