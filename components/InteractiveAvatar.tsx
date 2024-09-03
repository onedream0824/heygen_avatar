"use client"
import { AVATARS, VOICES } from "@/app/lib/constants";
import {
  Configuration,
  NewSessionData,
  StreamingAvatarApi,
} from "@heygen/streaming-avatar";
import {
  Button,
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Spinner,
  Tooltip,
} from "@nextui-org/react";
import { supabase } from '../app/lib/supabaseClient';
import AddSession from './AddSession';
import { Microphone, MicrophoneStage } from "@phosphor-icons/react";
import { useChat } from "ai/react";
import clsx from "clsx";
import { useAuth } from '@/app/hooks/useAuth';
import OpenAI from "openai";
import { useEffect, useRef, useState } from "react";
import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});
export default function InteractiveAvatar() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [debug, setDebug] = useState<string>();
  const [time, setTime] = useState(0);
  const [avatarId, setAvatarId] = useState<string>("");
  const [voiceId, setVoiceId] = useState<string>("");
  const [data, setData] = useState<NewSessionData>();
  const [text, setText] = useState<string>("");
  const [initialized, setInitialized] = useState(false); // Track initialization
  const [recording, setRecording] = useState(false); // Track recording state
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatarApi | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const minutes = Math.floor(time / 60).toString().padStart(2, '0');
  const seconds = (time % 60).toString().padStart(2, '0');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const { user, loading, logout } = useAuth();
  const sessionList = ['Session 1', 'Session 2', 'Session 3', 'Session 4'];
  const historyList = ['List Item 1', 'List Item 2', 'List Item 3', 'List Item 4'];
  const { input, setInput, handleSubmit } = useChat({
    onFinish: async (message) => {
      console.log("ChatGPT Response:", message);
      if (!initialized || !avatar.current) {
        setDebug("Avatar API not initialized");
        return;
      }
      //send the ChatGPT response to the Interactive Avatar
      await avatar.current
        .speak({
          taskRequest: { text: message.content, sessionId: data?.sessionId },
        })
        .catch((e) => {
          setDebug(e.message);
        });
      setIsLoadingChat(false);
    },
    initialMessages: [
      {
        id: "1",
        role: "system",
        content: "You are a helpful assistant.",
      },
    ],
  });
  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();
      console.log("Access Token:", token); // Log the token to verify
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
            avatarName: avatarId,
            voice: { voiceId: voiceId },
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
    console.log("Updating Access Token:", newToken); // Log token for debugging
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
  async function handleInterrupt() {
    if (!initialized || !avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    await avatar.current
      .interrupt({ interruptRequest: { sessionId: data?.sessionId } })
      .catch((e) => {
        setDebug(e.message);
      });
  }
  async function endSession() {
    if (!initialized || !avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    await avatar.current.stopAvatar(
      { stopSessionRequest: { sessionId: data?.sessionId } },
      setDebug
    );
    setStream(undefined);
  }
  async function handleSpeak() {
    setIsLoadingRepeat(true);
    if (!initialized || !avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    await avatar.current
      .speak({ taskRequest: { text: text, sessionId: data?.sessionId } })
      .catch((e) => {
        setDebug(e.message);
      });
    setIsLoadingRepeat(false);
  }
  useEffect(() => {
    async function init() {
      const newToken = await fetchAccessToken();
      console.log("Initializing with Access Token:", newToken); // Log token for debugging
      avatar.current = new StreamingAvatarApi(
        new Configuration({ accessToken: newToken, jitterBuffer: 200 })
      );
      setInitialized(true); // Set initialized to true
    }
    init();
    return () => {
      endSession();
    };
  }, []);
  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Playing");
      };
    }
  }, [mediaStream, stream]);

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
        console.log("+++++++++++++++++++++++++++");
      })
      .catch((error) => {
        alert("Error accessing microphone");
      });
  }

  function stopRecording() {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  }
  function press_Talk_To_AI() {
    console.log(recording);
    if (recording === false) {
      startRecording();
    } else {
      stopRecording();
    }
  }
  async function transcribeAudio(audioBlob: Blob) {
    try {
      // Convert Blob to File
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
  async function handleLogout() {
    try {
      await logout(); // Call the logout function
      // Optionally navigate or show a success message
    } catch (error) {
      console.error('Error logging out:', error);
      // Optionally show an error message to the user
    }
  };



  useEffect(() => {
    if (!input)
      return;
    console.log('*** input', input);
    handleSubmit();
  }, [input]);

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

  return (
    <>
      {stream ? (
        <>
          <div className="flex flex-col md:flex-row w-[90%] h-full mx-auto">
            <div className="w-full md:w-[18%] h-full flex-shrink-0 bg-black text-white">
              <div className="w-full h-[20%] flex text-left justify-center">
                <div className="m-auto w-full">
                  <p className="text-4xl font-bold">9:50</p>
                  <p className="text-2xl italic">buy more time</p>
                </div>
              </div>
              <div className="flex justify-center mb-4">
                <Button className="bg-blue-600 text-white font-bold py-2 px-4 rounded-xl hover:bg-blue-800 transition duration-300 shadow-lg" onClick={addChannel}>
                  Add Session
                </Button>
              </div>
              <div className="bg-gray-800 rounded-2xl h-[50%] shadow-lg">
                <ul className="w-full mt-auto text-white px-6 py-4 space-y-2">
                  {sessionList.map((item, index) => (
                    <li key={index} className="hover:text-blue-400 cursor-pointer transition duration-200">{item}</li>
                  ))}
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
              <div className="mb-4">
                <InteractiveAvatarTextInput
                  label="Chat"
                  placeholder="Chat with the avatar (uses ChatGPT)"
                  input={input}
                  onSubmit={() => {
                    setIsLoadingChat(true);
                    if (!input) {
                      setDebug("Please enter text to send to ChatGPT");
                      return;
                    }
                    handleSubmit();
                  }}
                  setInput={setInput}
                  loading={isLoadingChat}
                  endContent={
                    <Tooltip
                      content={!recording ? "Start recording" : "Stop recording"}
                    >
                      <Button
                        onClick={!recording ? startRecording : stopRecording}
                        isDisabled={!stream}
                        isIconOnly
                        className={clsx(
                          "mr-4 text-white",
                          !recording
                            ? "bg-gradient-to-tr from-indigo-500 to-indigo-300"
                            : ""
                        )}
                        size="sm"
                        variant="shadow"
                      >
                        {!recording ? (
                          <Microphone size={20} />
                        ) : (
                          <>
                            <div className="absolute h-full w-full bg-gradient-to-tr from-indigo-500 to-indigo-300 animate-pulse -z-10"></div>
                            <MicrophoneStage size={20} />
                          </>
                        )}
                      </Button>
                    </Tooltip>
                  }
                  disabled={!stream}
                />
              </div>
              <div className="bg-slate-800 rounded-2xl h-[50%]">
                <ul className="w-full mt-auto text-white px-6 py-4 space-y-2">
                  {historyList.map((item, index) => (
                    <li key={index} className="hover:text-blue-300 cursor-pointer">{item}</li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
          <AddSession
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
          />
        </>
      ) : !isLoadingSession ? (
        <div className="flex justify-center items-center min-h-screen bg-black">
          <div className="w-full flex flex-col gap-4 items-center">
            <Card style={{ borderColor: "black", backgroundColor: 'black' }}>
              <CardBody className="h-[500px] flex flex-col justify-center items-center">
                <div className="h-full flex flex-col gap-8 w-[500px] self-center">
                  <div className="flex flex-col gap-2 w-full">
                    <p className="text-sm font-medium leading-none">Custom Avatar ID (optional)</p>
                    <Input
                      value={avatarId}
                      onChange={(e) => setAvatarId(e.target.value)}
                      placeholder="Enter a custom avatar ID"
                    />
                    <Select
                      placeholder="Or select one from these example avatars"
                      size="md"
                      onChange={(e) => setAvatarId(e.target.value)}
                    >
                      {AVATARS.map((avatar) => (
                        <SelectItem key={avatar.avatar_id} textValue={avatar.avatar_id}>
                          {avatar.name}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <p className="text-sm font-medium leading-none">Custom Voice ID (optional)</p>
                    <Input
                      value={voiceId}
                      onChange={(e) => setVoiceId(e.target.value)}
                      placeholder="Enter a custom voice ID"
                    />
                    <Select
                      placeholder="Or select one from these example voices"
                      size="md"
                      onChange={(e) => setVoiceId(e.target.value)}
                    >
                      {VOICES.map((voice) => (
                        <SelectItem key={voice.voice_id} textValue={voice.voice_id}>
                          {voice.name} | {voice.language} | {voice.gender}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                  <Button
                    size="md"
                    onClick={startSession}
                    className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white"
                    variant="shadow"
                  >
                    Start session
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      ) : (
        <div className="flex justify-center items-center h-screen">
          <Spinner size="lg" color="default" />
        </div>
      )}
    </>
  );
}