import { useState } from "react";
import { useNavigate } from "react-router-dom";

function JoinRoomPage() {
    const [roomId, setRoomId] = useState("");
    const [username, setUsername] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (event) => {
        event.preventDefault();
        const normalizedRoomId = roomId.trim();
        const normalizedUsername = username.trim();

        if (!normalizedRoomId || !normalizedUsername) {
            setError("Room ID and username are required.");
            return;
        }

        const params = new URLSearchParams({
            roomId: normalizedRoomId,
            username: normalizedUsername,
        });

        navigate(`/editor?${params.toString()}`);
    };

    return (
        <div className="min-h-screen w-screen bg-[#1e1e1e] text-[#cccccc] flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-[#252526] border border-[#3c3c3c] rounded-md p-6 shadow-lg">
                <h1 className="text-xl font-semibold text-white mb-2">Join a Collaboration Room</h1>
                <p className="text-sm text-[#9aa0a6] mb-6">Enter room details to start coding together.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm mb-1 text-[#c7c7c7]" htmlFor="room-id">
                            Room ID
                        </label>
                        <input
                            id="room-id"
                            value={roomId}
                            onChange={(event) => setRoomId(event.target.value)}
                            placeholder="e.g. team-42"
                            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] text-[#cccccc] text-sm px-3 py-2 rounded-sm outline-none focus:border-[#007acc]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm mb-1 text-[#c7c7c7]" htmlFor="username">
                            Username
                        </label>
                        <input
                            id="username"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            placeholder="e.g. anuj"
                            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] text-[#cccccc] text-sm px-3 py-2 rounded-sm outline-none focus:border-[#007acc]"
                        />
                    </div>

                    {error && <p className="text-sm text-[#f48771]">{error}</p>}

                    <button
                        type="submit"
                        className="w-full bg-[#007acc] hover:bg-[#005f9e] text-white px-4 py-2 rounded-sm text-sm font-medium transition-colors"
                    >
                        Join Room
                    </button>
                </form>
            </div>
        </div>
    );
}

export default JoinRoomPage;
