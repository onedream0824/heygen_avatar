"use client";

import { useAuth } from '@/app/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Stylish Loading Spinner Component
const LoadingSpinner: React.FC = () => {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
            <span className="ml-4 text-xl text-gray-700">Loading...</span>
        </div>
    );
};

// Protected Page Component
const ProtectedPage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (pathname === '/auth/sign-up' || pathname === '/auth/sign-in') {
            return;
        }
        if (!loading && !user) {
            router.push('/auth/sign-in');
        }
    }, [user, loading, router, pathname]);

    if (loading) return <LoadingSpinner />;

    return (
        <>
            {children}
        </>
    );
};

export default ProtectedPage;