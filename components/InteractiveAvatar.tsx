"use client"
import {
    Configuration,
    NewSessionData,
    StreamingAvatarApi,
} from "@heygen/streaming-avatar";
import {
    Button,
    Card,
    CardBody,
    Spinner,
} from "@nextui-org/react";
import { supabase } from '@/app/lib/supabaseClient';
import AddSession from './AddSession';
import { useChat } from "ai/react";
import { useAuth } from '@/app/hooks/useAuth';
import OpenAI from "openai";
import { useEffect, useRef, useState } from "react";
import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CountDownTimer from './CountDownTimer';


interface Session {
    id: string;
    name: string;
}

interface Chat {
    chat: string;
    type: boolean;
}

const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
});

export default function InteractiveAvatar() {
    const [getChannelLoading, setGetChannelLoading] = useState(false);
    const [isLoadingSession, setIsLoadingSession] = useState(false);
    const [currentChannelId, setCurrentChannelId] = useState("");
    const [refreshStatus, setRefreshStatus] = useState<boolean>(false);
    const [isLoadingChat, setIsLoadingChat] = useState(false);
    const [stream, setStream] = useState<MediaStream>();
    const [debug, setDebug] = useState<string>();
    const [time, setTime] = useState(0);
    const [limitTime, setLimitTime] = useState<number>(660);
    const [voiceId, setVoiceId] = useState<string>("");
    const [data, setData] = useState<NewSessionData>();
    const [initialized, setInitialized] = useState(false);
    const [recording, setRecording] = useState(false);
    const mediaStream = useRef<HTMLVideoElement>(null);
    const avatar = useRef<StreamingAvatarApi | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const minutes = Math.floor(time / 60).toString().padStart(2, '0');
    const seconds = (time % 60).toString().padStart(2, '0');
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const { user, loading, logout } = useAuth();
    const [sessionList, setSessionList] = useState<Session[]>([]);
    const [historyList, setHistoryList] = useState<Chat[]>([]);
    const [firstTime, setFirstTime] = useState<boolean>(false);
    const [timerStatus, setTimerStatus] = useState<string>('Running'); // Status of the timer
    const { input, setInput, handleSubmit } = useChat({
        onFinish: async (message: any) => {
            if (!initialized || !avatar.current) {
                setDebug("Avatar API not initialized");
                return;
            }
            await avatar.current
                .speak({
                    taskRequest: { text: message.content, sessionId: data?.sessionId },
                })
                .catch((e) => {
                    setDebug(e.message);
                });
            setIsLoadingChat(false)
            await saveChat(message.content, false);
            console.log("refreshStatus", refreshStatus);
            setRefreshStatus(prev => !prev);
        },
        initialMessages: [
            {
                id: "1",
                role: "system",
                content: "You are a helpful assistant.",
            },
        ],
    });

    const handleTimerComplete = () => {
        setTimerStatus('Completed');
        setFirstTime(false);
    };

    async function fetchAccessToken() {
        try {
            const response = await fetch("/api/get-access-token", {
                method: "POST",
            });
            const token = await response.text();
            return token;
        } catch (error) {
            console.error("Error fetching access token:", error);
            return "";
        }
    }

    async function startSession() {
        setIsLoadingSession(true);
        await updateToken();
        if (!avatar.current) {
            setDebug("Avatar API is not initialized");
            return;
        }
        try {
            const res = await avatar.current.createStartAvatar(
                {
                    newSessionRequest: {
                        quality: "low",
                        avatarName: "d4c979acc5314bbcae1000d51b2cde98",
                        voice: { voiceId: "" },
                    },
                },
                setDebug
            );
            setData(res);
            setStream(avatar.current.mediaStream);
        } catch (error) {
            console.error("Error starting avatar session:", error);
            setDebug(
                `There was an error starting the session. ${voiceId ? "This custom voice ID may not be supported." : ""}`
            );
        }
        setIsLoadingSession(false);
    }

    async function updateToken() {
        const newToken = await fetchAccessToken();
        console.log("Updating Access Token:", newToken);
        avatar.current = new StreamingAvatarApi(
            new Configuration({ accessToken: newToken })
        );
        const startTalkCallback = (e: any) => {
            console.log("Avatar started talking", e);
        };
        const stopTalkCallback = (e: any) => {
            console.log("Avatar stopped talking", e);
        };
        console.log("Adding event handlers:", avatar.current);
        avatar.current.addEventHandler("avatar_start_talking", startTalkCallback);
        avatar.current.addEventHandler("avatar_stop_talking", stopTalkCallback);
        setInitialized(true);
    }

    async function saveChat(chat: string, type: boolean) {
        try {
            const { data, error } = await supabase
                .from('chats')
                .insert([{ type: type, chat: chat, session_id: currentChannelId, created_at: new Date().toUTCString() }]);
            if (error) throw error;
        } catch (error) {
            console.error('Error adding chat:', error);
        } finally {
            console.log("success");
        }
    };

    const fetchChatHistory = async (id: string) => {
        setGetChannelLoading(true);
        try {
            const { data, error } = await supabase
                .from('chats')
                .select('*')
                .eq("session_id", id);
            if (error) throw error;

            let temp: Chat[] = [];
            data.forEach((chat) => {
                temp.push({ chat: chat.chat, type: chat.type });
            });
            setHistoryList(temp);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setGetChannelLoading(false);
        }
    };

    const checkLimitTime = () => {
        if (limitTime > 0) return true;
        else return false;
    }

    const fetchChannels = async () => {
        try {
            const user_id = (await supabase.auth.getSession()).data.session?.user.id;
            const { data, error } = await supabase
                .from('sessions')
                .select('*')
                .eq('user_id', user_id);

            if (error) throw error;

            let temp: Session[] = [];
            data.forEach((session) => {
                temp.push({ name: session.name, id: session.id });
            });
            setSessionList(temp);
            setCurrentChannelId(temp[0].id);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setGetChannelLoading(false);
        }
    };

    function startRecording() {
        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
                mediaRecorder.current = new MediaRecorder(stream);
                mediaRecorder.current.ondataavailable = (event) => {
                    audioChunks.current.push(event.data);
                };
                mediaRecorder.current.onstop = () => {
                    const audioBlob = new Blob(audioChunks.current, {
                        type: "audio/wav",
                    });
                    audioChunks.current = [];
                    transcribeAudio(audioBlob);
                };
                mediaRecorder.current.start();
                setRecording(true);
            })
            .catch((error) => {
                toast.error("Error accessing microphone");
            });
    }

    function stopRecording() {
        if (mediaRecorder.current) {
            mediaRecorder.current.stop();
            setRecording(false);
        }
    }

    function press_Talk_To_AI() {
        if (checkLimitTime() === true) {
            if (recording === false) {
                startRecording();
            } else {
                stopRecording();
            }
        } else {
            toast.error("The free version was runned out.");
        }
    }

    async function transcribeAudio(audioBlob: Blob) {
        try {
            const audioFile = new File([audioBlob], "recording.wav", {
                type: "audio/wav",
            });
            const response = await openai.audio.transcriptions.create({
                model: "whisper-1",
                file: audioFile,
            });
            const transcription = response.text;
            console.log("Transcription: ", transcription);
            setInput(transcription);
        } catch (error) {
            console.error("Error transcribing audio:", error);
        }
    }

    function addChannel() {
        setDialogOpen(true);
    }

    function handleSessionClick(item: Session) {
        setCurrentChannelId(item.id);
        setRefreshStatus(!refreshStatus);
    }

    async function handleLogout() {
        try {
            await logout();
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    async function submit() {
        if (limitTime > 0) {
            setFirstTime(true);
            if (!input) {
                setDebug("Please enter text to send to ChatGPT");
                return;
            }

            if (checkLimitTime() == true) {
                setIsLoadingChat(true);
                await saveChat(input, true);
                setRefreshStatus(!refreshStatus);
                handleSubmit();
            }
        }
        else {
            toast.error("The free version was runned out.");
            console.log(checkLimitTime());
        }
    }

    useEffect(() => {
        let timerInterval: NodeJS.Timeout | null = null;
        if (recording) {
            timerInterval = setInterval(() => {
                setTime(oldTime => oldTime + 1);
            }, 1000);
        } else {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
        }
        return () => {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
        };
    }, [recording]);

    useEffect(() => {
        fetchChannels();
        startSession();
    }, []);

    useEffect(() => {
        if (!currentChannelId)
            return;
        fetchChatHistory(currentChannelId);
    }, [refreshStatus, currentChannelId]);


    useEffect(() => {
        if (stream && mediaStream.current) {
            mediaStream.current.srcObject = stream;
            mediaStream.current.onloadedmetadata = () => {
                mediaStream.current!.play();
                setDebug("Playing");
            };
        }
    }, [mediaStream, stream]);

    useEffect(() => {
        const fetchUserTime = async () => {
            const userId = (await supabase.auth.getSession()).data.session?.user.id;
            if (userId) {
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('time')
                    .eq('id', userId)
                    .single();

                if (userError) {
                    console.error('Error fetching user time:', userError);
                } else if (userData) {
                    setLimitTime(userData.time); // Set the user's time from the database
                }
            }
        };

        if (firstTime) {
            fetchUserTime(); // Fetch user time if firstTime is true
        }
    }, [firstTime]);


    return (
        <>
            {stream ? (
                <>
                    <div className="flex flex-col md:flex-row w-[90%] h-full mx-auto">
                        <ToastContainer />
                        <div className="w-full md:w-[18%] h-full flex-shrink-0 bg-black text-white">
                            <div className="w-full h-[20%] flex text-left justify-center">
                                <div className="m-auto w-full">
                                    <CountDownTimer isActive={firstTime} limitTime={limitTime} setLimitTime={setLimitTime} onTimerComplete={handleTimerComplete} />
                                    <p className="text-2xl italic">buy more time</p>
                                </div>
                            </div>
                            <div className="flex justify-center mb-4">
                                <Button className="bg-blue-600 text-white font-bold py-2 px-4 rounded-full hover:bg-blue-700 transition duration-300 shadow-lg transform hover:scale-105" onClick={addChannel}>
                                    Add Channel
                                </Button>
                            </div>
                            <div className="bg-gray-900 rounded-2xl h-[50%] shadow-xl overflow-hidden">
                                <h3 className="text-lg text-left font-semibold text-white px-6 py-4 border-gray-700">
                                    Channels
                                </h3>
                                <ul className="w-full mt-0 text-white px-6 py-2 space-y-2">
                                    {loading ? (
                                        <li className="text-gray-400 text-center">Loading sessions...</li>
                                    ) : sessionList.length === 0 ? (
                                        <li className="text-gray-400">No sessions available</li>
                                    ) : (
                                        sessionList.map((item) => (
                                            <li
                                                key={item.id}
                                                className={`cursor-pointer transition duration-200 flex justify-between items-center py-3 px-4 rounded-md 
                        ${currentChannelId === item.id ? 'bg-blue-600 text-white' : 'hover:bg-blue-500 text-gray-200'} 
                        ${currentChannelId === item.id ? 'shadow-md' : 'shadow-sm'}
                    `}
                                                onClick={() => handleSessionClick(item)}
                                            >
                                                <span className="flex-1">{item.name}</span>
                                                <span className={`text-xs ${currentChannelId === item.id ? 'text-white' : 'text-gray-400'}`}>
                                                    {currentChannelId === item.id ? 'Active' : 'Inactive'}
                                                </span>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </div>
                        </div>
                        <div className="w-full md:w-[64%] h-full flex flex-col items-center bg-black">
                            <div className="flex flex-col items-center justify-center mt-16">
                                <p className="font-bold text-5xl text-center">AI Branding Expert</p>
                                <p className="text-2xl text-center text-blue-400">{`${minutes}:${seconds}`}</p>
                            </div>
                            <div className="flex-grow flex justify-center items-center w-full">
                                <Card style={{ borderColor: "black", backgroundColor: 'black' }}>
                                    <CardBody className="h-[730px] flex flex-col justify-center items-center">
                                        <div className="w-full h-full flex justify-center items-center relative">
                                            <div className="w-full h-full flex justify-center items-center rounded-lg overflow-hidden">
                                                <video
                                                    ref={mediaStream}
                                                    autoPlay
                                                    playsInline
                                                    className="w-full h-full object-contain"
                                                >
                                                    <track kind="captions" />
                                                </video>
                                                <div
                                                    id="talkbtn"
                                                    className="absolute flex justify-center items-center text-white cursor-pointer transition-transform duration-300 ease-in-out transform hover:scale-110"
                                                    style={{
                                                        width: "150px",
                                                        height: "150px",
                                                        top: "75%",
                                                        backgroundColor: "rgb(95, 169, 224)",
                                                        borderRadius: "75px",
                                                        left: "50%",
                                                        transform: "translate(-50%, -50%)",
                                                    }}
                                                    onClick={press_Talk_To_AI}
                                                >
                                                    <span className="text-xl">{recording ? "Stop" : "Talk To AI"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            </div>
                        </div>

                        <div className="w-full md:w-[18%] h-full flex-shrink-0 bg-black text-white">
                            <div className="w-full h-[20%] flex text-right justify-center">
                                <div className="m-auto w-full">
                                    <p className="text-4xl font-bold">John Travolta</p>
                                    <button
                                        onClick={handleLogout}
                                        className="text-2xl underline hover:text-blue-300 transition duration-300"
                                    >
                                        Log Out
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center mb-4">
                                <InteractiveAvatarTextInput
                                    label="Chat"
                                    placeholder="Chat with the avatar (uses ChatGPT)"
                                    input={input}
                                    onSubmit={async () => {
                                        submit();
                                    }}

                                    setInput={setInput}
                                    loading={isLoadingChat}
                                    disabled={!stream}
                                />

                            </div>
                            <div className="bg-gray-900 rounded-2xl h-[50%] p-6 shadow-lg">
                                <h3 className="text-xl font-semibold text-white mb-4">Chat History</h3>
                                <ul className="w-full h-[90%] overflow-y-auto space-y-4">
                                    {historyList.map((item, index) => (
                                        <li
                                            key={index}
                                            className={`flex items-start ${item.type ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-xs px-4 py-2 rounded-lg text-sm ${item.type ? 'bg-blue-500 text-white' : 'bg-gray-700 text-white'
                                                    } transition duration-200`}
                                            >
                                                <span className="font-semibold">{item.type ? 'You:' : 'GPT:'}</span> {item.chat}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                    </div>
                    <AddSession
                        onApply={fetchChannels}
                        open={dialogOpen}
                        onClose={() => setDialogOpen(false)}
                    />
                </>
            ) :
                <div className="flex justify-center items-center h-screen">
                    <Spinner size="lg" color="default" />
                </div>
            }
        </>
    );
}