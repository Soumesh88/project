import { useNavigate } from "react-router-dom";
import { HeartPulse, UserPlus, LogIn } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-white">
      <div className="w-full max-w-lg bg-white shadow-lg rounded-2xl p-8 text-center">
        <HeartPulse size={48} className="text-blue-500 mx-auto mb-4" />
        <h1 className="text-3xl font-semibold text-gray-800">Welcome to MedBot</h1>
        <p className="text-gray-600 mt-2">Your AI-powered medical assistant.</p>

        <div className="mt-6 flex flex-col gap-4">
          <button
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition"
            onClick={() => navigate("/login")}
          >
            <LogIn className="inline mr-2" /> Login
          </button>
          <button
            className="w-full border border-blue-500 text-blue-500 py-3 rounded-lg hover:bg-blue-500 hover:text-white transition"
            onClick={() => navigate("/signup")}
          >
            <UserPlus className="inline mr-2" /> Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}

