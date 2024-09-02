"use client"

import { useAuth } from '@/app/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';


function ProtectedPage({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (pathname == '/auth/sign-up' || pathname == '/auth/sign-in') {
            return;
        }
        if (!loading && !user) {
            router.push('/auth/sign-in');
        }
    }, [user, loading, router]);

    if (loading) return <div>Loading...</div>;

    return (
        <>
            {children}
        </>
    );
};

export default ProtectedPage;