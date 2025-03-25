import { useState } from "react";

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;
   
    const userMessage = { sender: "user", text: input };
    setMessages([...messages, userMessage]);
    setInput("");
   
    const response = await fetch("http://127.0.0.1:5000", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input })
    });
   
    const data = await response.json();
    const botMessage = { sender: "bot", text: data.response };
    setMessages((prev) => [...prev, botMessage]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#f0f0f0", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "400px", backgroundColor: "white", boxShadow: "0 0 10px rgba(0,0,0,0.1)", borderRadius: "10px", padding: "20px" }}>
        <div style={{ height: "300px", overflowY: "auto", marginBottom: "10px", border: "1px solid #ddd", padding: "10px", borderRadius: "5px" }}>
          {messages.map((msg, index) => (
            <div key={index} style={{ padding: "8px", borderRadius: "5px", marginBottom: "5px", backgroundColor: msg.sender === "user" ? "#007bff" : "#e0e0e0", color: msg.sender === "user" ? "white" : "black", alignSelf: msg.sender === "user" ? "flex-end" : "flex-start", textAlign: msg.sender === "user" ? "right" : "left" }}>
              {msg.text}
            </div>
          ))}
        </div>
        <div style={{ display: "flex" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            style={{ flexGrow: 1, padding: "10px", border: "1px solid #ccc", borderRadius: "5px", marginRight: "5px" }}
          />
          <button onClick={sendMessage} style={{ padding: "10px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}