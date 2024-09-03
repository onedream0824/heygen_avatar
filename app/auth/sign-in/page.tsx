"use client";
import { useAuth } from '@/app/hooks/useAuth';
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SignIn = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (user) {
            router.push('/');
        }
    }, [user, loading, router]);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            toast.error("Wrong credentials, please try again.");
        } else {
            router.push('/');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-black">
            <ToastContainer />
            <div className="bg-gray-800 shadow-lg rounded-lg p-8 max-w-md w-full">
                <h2 className="text-3xl font-bold text-center text-white mb-6">Sign In</h2>
                <form onSubmit={handleSignIn}>
                    <div className="mb-4">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full p-3 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-700 text-white"
                        />
                    </div>
                    <div className="mb-6">
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full p-3 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-700 text-white"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700 transition duration-200"
                    >
                        Sign In
                    </button>
                </form>
                <p className="mt-4 text-center text-gray-400">
                    Don't have an account? <a href="/auth/sign-up" className="text-blue-400 hover:underline">Sign Up</a>
                </p>
            </div>
        </div>
    );
};

export default SignIn;
