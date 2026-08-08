import { SVGAttributes } from 'react';

export default function ApplicationLogo(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect width="100" height="100" rx="20" fill="#4F46E5" />
            <g transform="translate(24,26)">
                <circle cx="3" cy="42" r="4.5" fill="#EEF2FF" />
                <circle cx="26" cy="27" r="4.5" fill="#EEF2FF" />
                <circle cx="49" cy="4" r="4.5" fill="#22C55E" />
                <path
                    d="M3 42 L26 27 L49 4"
                    stroke="#EEF2FF"
                    strokeWidth={5.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </g>
        </svg>
    );
}
