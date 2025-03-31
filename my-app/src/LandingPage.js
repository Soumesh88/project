import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Welcome to the Chatbot</h1>
      <p>Please log in or sign up to continue.</p>
      <button onClick={() => navigate("/login")} style={buttonStyle}>
        Login
      </button>
      <button onClick={() => navigate("/signup")} style={buttonStyle}>
        Sign Up
      </button>
    </div>
  );
}

const buttonStyle = {
  margin: "10px",
  padding: "10px 20px",
  fontSize: "16px",
  cursor: "pointer",
};
