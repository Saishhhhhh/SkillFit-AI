import React from 'react';

/**
 * Official SkillFit AI Logo Component
 * Uses a Zap icon with a premium indigo-violet gradient background
 */
export default function Logo({ className = "", iconClassName = "h-5 w-5" }) {
    return (
        <div className={`bg-gradient-to-br from-indigo-500 to-violet-600 p-1.5 rounded-xl shadow-lg shadow-indigo-500/20 group-hover:scale-105 group-hover:rotate-6 transition-all duration-300 ${className}`}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`lucide lucide-zap ${iconClassName} text-white fill-white`}
                aria-hidden="true"
            >
                <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>
            </svg>
        </div>
    );
}
