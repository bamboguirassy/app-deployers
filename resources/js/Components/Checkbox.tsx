import { Checkbox as AntCheckbox, CheckboxProps } from 'antd';

export default function Checkbox({ className = '', ...props }: CheckboxProps) {
    return <AntCheckbox className={className} {...props} />;
}
