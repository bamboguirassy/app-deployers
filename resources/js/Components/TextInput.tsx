import { Input, InputRef } from 'antd';
import {
    forwardRef,
    InputHTMLAttributes,
    useEffect,
    useImperativeHandle,
    useRef,
} from 'react';

export default forwardRef(function TextInput(
    {
        type = 'text',
        className = '',
        isFocused = false,
        ...props
    }: InputHTMLAttributes<HTMLInputElement> & { isFocused?: boolean },
    ref,
) {
    const localRef = useRef<InputRef>(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    const Component = type === 'password' ? Input.Password : Input;

    return (
        <Component
            {...props}
            type={type === 'password' ? undefined : type}
            size="large"
            className={className}
            ref={localRef}
        />
    );
});
