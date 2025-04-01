import { useState, useEffect, useRef, useContext } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export default function Chatbot() {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages([...messages, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000", {
        method: "POST",
        headers: { Authorization: `Bearer ${user?.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();
      setLoading(false);
      
      // Process the final answer
      const finalAnswer = data.final_answer || "";
      
      if (data.diseases && data.diseases.length > 0) {
        setMessages((prev) => [
          ...prev,
          { 
            sender: "bot", 
            text: "Possible diseases:", 
            isList: true, 
            list: data.diseases 
          },
          { 
            sender: "bot", 
            text: finalAnswer,
            isMedicalReport: true
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev, 
          { 
            sender: "bot", 
            text: finalAnswer,
            isMedicalReport: data.final_answer && data.final_answer.includes("### Diagnosis") 
          }
        ]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Sorry, there was an error processing your request. Please try again." }
      ]);
    }
  };

  // Custom renderer components for markdown
  const components = {
    h3: ({ children }) => <h3 className="text-lg font-bold mt-3 mb-2 text-blue-700">{children}</h3>,
    h4: ({ children }) => <h4 className="text-md font-semibold mt-2 mb-1 text-blue-600">{children}</h4>,
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    ul: ({ children }) => <ul className="list-disc pl-5 my-2">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 my-2">{children}</ol>,
    li: ({ children }) => <li className="my-1">{children}</li>,
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex justify-between items-center p-4 bg-blue-600 text-white shadow-md">
        <h2 className="text-xl font-semibold">Medbot</h2>
        <button
          onClick={() => navigate("/profile")}
          className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-gray-200 transition"
        >
          Profile
        </button>
      </div>

      <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 space-y-3">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`max-w-3xl p-4 rounded-lg shadow-md ${
              msg.sender === "user" 
                ? "ml-auto bg-blue-500 text-white" 
                : msg.isMedicalReport 
                  ? "bg-white border border-blue-200 text-black" 
                  : "bg-gray-200 text-black"
            }`}
          >
            {msg.isList ? (
              <>
                <h3 className="font-semibold">{msg.text}</h3>
                <ul className="list-disc pl-5">
                  {msg.list.map((disease, i) => (
                    <li key={i} className="text-red-500">{disease}</li>
                  ))}
                </ul>
              </>
            ) : msg.isMedicalReport ? (
              <div className="medical-report">
                <ReactMarkdown components={components}>{msg.text}</ReactMarkdown>
              </div>
            ) : (
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            )}
          </div>
        ))}
        {loading && (
          <div className="p-3 bg-gray-200 rounded-lg shadow-md max-w-2xl animate-pulse">Typing...</div>
        )}
      </div>

      <div className="flex items-center p-4 border-t bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow p-3 border rounded-md focus:ring focus:ring-blue-300 outline-none"
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="ml-3 bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
