import { useState , useRef, useEffect, use, useCallback , useMemo} from "react";
import { Editor } from "@monaco-editor/react";
import axios from "axios";
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate, useSearchParams } from "react-router-dom";
import * as Y from "yjs";
import {MonacoBinding} from "y-monaco"; 
import {io} from "socket.io-client"

const LANGUAGES = {
    js: {
        label: "JavaScript",
        apiValue: "javascript",
        editorLanguageCode: "javascript",
        fileName: "main.js",
        template: `const fs = require("fs");

const input = fs.readFileSync(0, "utf8").trim();
console.log(input || "hello from anuj");`,
    },
    python: {
        label: "Python",
        apiValue: "python",
        editorLanguageCode: "python",
        fileName: "main.py",
        template: `import sys

data = sys.stdin.read().strip()
print(data if data else "hello from anuj")`,
    },
    cpp: {
        label: "C++",
        apiValue: "cpp",
        editorLanguageCode: "cpp",
        fileName: "main.cpp",
        template: `#include <iostream>
using namespace std;

int main() {
    string input;
    getline(cin, input);
	cout << (input.empty() ? "hello from anuj" : input) << "\\n";
    return 0;
}`,
    },
};

const DEFAULT_LANGUAGE = "js";

function MainPage() {

    const [searchParams] = useSearchParams();
    const roomId = searchParams.get("roomId");
    const userName = searchParams.get("username");
    const navigate = useNavigate();
    const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGE);
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [connectedUsers,setConnectedUsers] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);

    const editorRef = useRef(null);
    const yDocRef = useRef(null);
    const yTextRef = useRef(null);
    const bindingRef = useRef(null);
    const apiBaseUrl = `http://${window.location.hostname}:5000`;

    const socket = useMemo(() => {
        return io(apiBaseUrl, {
            autoConnect: false
        });
    }, [apiBaseUrl]);




    useEffect(() => {
        if(!roomId || !userName) {
            toast.error("Missing room ID or username. Please go back and enter the details.");
            navigate("/join");
            return;
        }

        const ydoc = new Y.Doc();
        const yText = ydoc.getText("code");

        yDocRef.current = ydoc;
        yTextRef.current = yText;

        if(editorRef.current){
            bindMonacoToYjs();
        }

        socket.connect();

        socket.emit("join-room",{roomId,userName});
        socket.emit("request-sync", { roomId });

        ydoc.on("update",(update,origin) => {
            if(origin !== "remote"){
                socket.emit("yjs-update",{roomId,update});
            }
        })

        socket.on("yjs-update",({update}) => {
            Y.applyUpdate(ydoc, new Uint8Array(update) , "remote");
        })

        socket.on("room-users",({clients}) => {
            setConnectedUsers(clients);
            if(clients.length <= 1){
                setIsSyncing(false);
            }
        })

        socket.on("user-joined",({userName}) => {
            toast(`${userName} joined the room.`);
        });

        socket.on("user-left",({userName}) => {
            toast(`${userName} left the room.`);
        })

        socket.on("sync-required",({socketId}) => {
            if(yDocRef.current){
                const fullUpdate = Y.encodeStateAsUpdate(yDocRef.current);
                socket.emit("sync-response",{socketId,update: Array.from(fullUpdate)});
            }
        })

        socket.on("sync-response",({update}) => {
            Y.applyUpdate(yDocRef.current, new Uint8Array(update) , "remote");
            setIsSyncing(false);
        })

        return () => {
            socket.disconnect();
            bindingRef.current?.destroy();
            bindingRef.current = null;
            yDocRef.current.destroy();
            socket.off("yjs-update");
            socket.off("room-users");
            socket.off("user-joined");
            socket.off("user-left");    
            socket.off("sync-required");
            socket.off("sync-response");
        };
    },[roomId,userName,socket,navigate])


    const bindMonacoToYjs = useCallback(() => {
        if(bindingRef.current){
            bindingRef.current.destroy();
            bindingRef.current = null;
        }
        if(!editorRef.current || !yTextRef.current) return;

        const model = editorRef.current.getModel();

        bindingRef.current = new MonacoBinding(
            yTextRef.current,
            model,
            new Set([editorRef.current]),
            null
        )
    },[])


    const handleEditorDidMount = (editor,monaco) => {
        editorRef.current = editor;
        bindMonacoToYjs();
    }



    const activeLanguage = LANGUAGES[selectedLanguage];
    const handleLanguageChange = (event) => {
        const nextLanguage = event.target.value;
        setSelectedLanguage(nextLanguage);
        setOutput("");
    };


    const submitCode = async () => {
        setIsSubmitting(true);
        try {   
            const response = await axios.post(`${apiBaseUrl}/submit`, {
                code : yTextRef.current.toString(),
                input,
                language: activeLanguage.apiValue,
            });
            setOutput(response?.data?.data?.output ?? "");
            console.log("Submission Response:", response.data);
        } catch (err) {
            console.log("Error Response:", err.response);
            toast.error(err.response?.data?.message || "An error occurred while submitting the code.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLeaveRoom = () => {
        navigate("/join");
        toast("Leave room clicked (dummy action)");
    };





    return (
        <>
        <Toaster 
        position="top-center"
        toastOptions={{
            duration: 2000,
        }}/>
        <div className="flex flex-col h-screen w-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden font-sans">
            {/* Top Bar */}
            <header className="flex min-h-12 items-center justify-between bg-[#333333] px-4 py-2 border-b border-[#252526] shrink-0 gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-sm text-white tracking-wide">ProjectX IDE</span>
                    <select
                        value={selectedLanguage}
                        onChange={handleLanguageChange}
                        disabled={isSubmitting}
                        className="bg-[#252526] border border-[#3c3c3c] text-[#cccccc] text-sm px-3 py-1.5 rounded-sm outline-none focus:border-[#007acc] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {Object.entries(LANGUAGES).map(([key, language]) => (
                            <option key={key} value={key} className="bg-[#252526] text-[#cccccc]">
                                {language.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleLeaveRoom}
                        className="flex items-center justify-center gap-2 bg-[#3c3c3c] hover:bg-[#4b4b4b] text-white px-4 py-1.5 rounded-sm text-sm font-medium transition-colors"
                    >
                        Leave Room
                    </button>
                    <button
                        onClick={submitCode}
                        disabled={isSubmitting}
                        className="flex items-center justify-center gap-2 bg-[#007acc] hover:bg-[#005f9e] text-white px-4 py-1.5 rounded-sm text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="animate-spin text-sm">↻</span> Running...
                            </>
                        ) : (
                            <>
                                <span className="text-sm">▶</span> Run
                            </>
                        )}
                    </button>
                </div>
            </header>

            {/* Main Layout */}
            <main className="flex flex-1 overflow-hidden h-full flex-row">
                {/* Left Sidebar (Input & Output) */}
                <aside className="w-[350px] md:w-[450px] flex flex-col bg-[#252526] border-r border-[#3c3c3c] shrink-0">
                    {/* Input Panel */}
                    <div className="flex flex-col flex-1 border-b border-[#3c3c3c] overflow-hidden">
                        <div className="flex items-center px-4 py-2 bg-[#2d2d2d] uppercase text-xs tracking-wider font-semibold group cursor-default">
                            <span>STDIN / Input</span>
                        </div>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1 w-full resize-none bg-transparent p-4 text-sm text-[#cccccc] outline-none font-mono focus:bg-[#1e1e1e]/50"
                            spellCheck="false"
                            placeholder="Enter input here..."
                        />
                    </div>

                    {/* Output Panel */}
                    <div className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] uppercase text-xs tracking-wider font-semibold group cursor-default">
                            <span>STDOUT / Output</span>
                        </div>
                        <div className="flex-1 w-full bg-transparent p-4 overflow-auto">
                            <pre className="text-sm text-[#cccccc] font-mono whitespace-pre-wrap">
                                {output || <span className="text-[#6c6c6c] italic">Run code to see output here.</span>}
                            </pre>
                        </div>
                    </div>
                </aside>

                {/* Right Side (Editor) */}
                <section className="flex-1 flex flex-col relative h-full bg-[#1e1e1e]">
                    {/* Editor Tabs bar */}
                    <div className="flex h-9 bg-[#252526] shrink-0 items-end overflow-hidden custom-scrollbar">
                        <div className="flex items-center px-4 py-2 bg-[#1e1e1e] border-t-2 border-t-[#007acc] text-[#cccccc] text-sm cursor-pointer min-w-[120px]">
                            <span className="text-[#519aba] mr-2">{activeLanguage.label}</span> {activeLanguage.fileName}
                        </div>
                    </div>

                    {/* Monaco IDE Wrapper */}
                    <div className="flex-1 w-full h-full relative">

                        {isSyncing && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#1e1e1e] bg-opacity-95 backdrop-blur-sm">
                                <div className="w-10 h-10 border-4 border-[#3c3c3c] border-t-[#007acc] rounded-full animate-spin mb-4"></div>
                                <p className="text-[#cccccc] text-sm font-medium animate-pulse tracking-wide">
                                    Syncing workspace...
                                </p>
                            </div>
                        )}  

                        <Editor
                            height="100%"
                            language={activeLanguage.editorLanguageCode}
                            theme="vs-dark"
                            onMount={handleEditorDidMount}
                            options={{
                                fontSize: 14,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                fontFamily: "Consolas, 'Courier New', monospace",
                                padding: { top: 16 }
                            }}
                        />
                    </div>
                </section>
            </main>
        </div>
    </>
    );
}

export default MainPage;
