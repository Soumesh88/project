import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./index.css";
import LandingPage from "./LandingPage";
import Chatbot from "./App";
import ProtectedChatbot from "./ProtectedBot";
import Login from "./Login";
import Signup from "./Signup";
import { AuthProvider } from "./AuthContext";
import Profile from "./Profile";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <AuthProvider>
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/chatbot" element={<ProtectedChatbot />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  </AuthProvider>
);

