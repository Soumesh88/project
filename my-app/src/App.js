import { useState, useEffect, useRef, useContext } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom"; // Import for navigation
import { AuthContext } from "./AuthContext";

export default function Chatbot() {
  const { user, logout } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatContainerRef = useRef(null);
  const navigate = useNavigate(); // Hook for navigation

  useEffect(() => {
    chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages([...messages, userMessage]);
    setInput("");

    try {
      const response = await fetch("http://127.0.0.1:5000", {
        method: "POST",
        headers: { Authorization: `Bearer ${user?.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();
      if (data.diseases && data.diseases.length > 0) {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: `Possible diseases:\n- ${data.diseases.join("\n- ")}` },
        ]);
      } 
      setMessages((prev) => [...prev, { sender: "bot", text: data.final_answer }]);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#f0f0f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", backgroundColor: "#007bff", color: "white" }}>
        <h2>Medbot</h2>
        <button 
          onClick={() => navigate("/profile")}
          style={{ backgroundColor: "white", color: "#007bff", border: "none", padding: "8px 15px", borderRadius: "5px", cursor: "pointer" }}
        >
          Profile
        </button>
      </div>

      <div ref={chatContainerRef} style={{ flexGrow: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column" }}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              maxWidth: "70%",
              alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
              backgroundColor: msg.sender === "user" ? "#007bff" : "#e0e0e0",
              color: msg.sender === "user" ? "white" : "black",
              padding: "10px",
              borderRadius: "10px",
              marginBottom: "8px",
              whiteSpace: "pre-wrap",
            }}
          >
            <ReactMarkdown>{msg.text}</ReactMarkdown>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", padding: "10px", borderTop: "1px solid #ccc", backgroundColor: "white" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{ flexGrow: 1, padding: "10px", border: "1px solid #ccc", borderRadius: "5px", marginRight: "10px" }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} style={{ padding: "10px 15px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
          Send
        </button>
      </div>
    </div>
  );
}

