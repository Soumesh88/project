import { useContext, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import Chatbot from "./App";
import { useNavigate } from "react-router-dom";

export default function ProtectedChatbot() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  return user ? <Chatbot /> : null;
}
