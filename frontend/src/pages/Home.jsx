import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Home() {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    const id = roomId.trim() || Math.random().toString(36).slice(2, 8);
    navigate(`/room/${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900">
      <h1 className="text-5xl font-bold text-white mb-2">🎨 CollaboDraw</h1>
      <p className="text-gray-400 mb-10 text-lg">Real-time collaborative drawing</p>

      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4">
        <label className="text-gray-300 text-sm font-medium">Room ID</label>
        <input
          type="text"
          placeholder="Enter a room ID or leave blank for random"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          className="w-full bg-gray-700 text-white placeholder-gray-500 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleJoin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Join Room →
        </button>
      </div>

      <p className="text-gray-600 mt-6 text-sm">
        Share the Room ID with others to draw together!
      </p>
    </div>
  );
}

export default Home;
