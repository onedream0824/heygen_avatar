import { supabase } from '../app/lib/supabaseClient';
import React, { useEffect, useState } from 'react';

interface CountdownTimerProps {
    isActive: boolean;
    onTimerComplete: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ isActive, onTimerComplete }) => {
    const [time, setTime] = useState<number>(600);

    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (isActive) {
            setTime(600);
            timer = setInterval(async () => {
                setTime(prevTime => {
                    if (prevTime <= 0) {
                        clearInterval(timer);
                        onTimerComplete();
                        return 0;
                    }

                    // Update the time value in the user table
                    updateUserTime(prevTime - 1);

                    return prevTime - 1;
                });
            }, 1000);
        }

        return () => clearInterval(timer);
    }, [isActive, onTimerComplete]);

    const updateUserTime = async (newTime: number) => {
        const userId = (await supabase.auth.getSession()).data.session?.user.id;
        const { data, error } = await supabase
            .from('users') // Replace with your actual table name
            .update({ time: newTime }) // Adjust the column name as needed
            .eq('id', userId); // Replace 'id' with the actual primary key field of your users table

        if (error) {
            console.error('Error updating time:', error);
        } else {
            console.log('Time updated successfully:', data);
        }
    };

    const limit_min = Math.floor(time / 60).toString().padStart(2, '0');
    const limit_sec = (time % 60).toString().padStart(2, '0');

    return (
        <div>
            <p className="text-4xl font-bold">{`${limit_min}:${limit_sec}`}</p>
        </div>
    );
};

export default CountdownTimer;