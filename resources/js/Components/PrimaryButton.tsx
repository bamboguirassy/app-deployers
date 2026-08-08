import { Button, ButtonProps } from 'antd';

export default function PrimaryButton({
    className = '',
    htmlType = 'submit',
    size = 'large',
    children,
    ...props
}: ButtonProps) {
    return (
        <Button
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
