import { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        console.log("Decoded Token:", decoded); // Debugging

        // Updated to handle email directly in sub claim
        if (decoded.sub) {
          setUser({ 
            email: typeof decoded.sub === 'object' ? decoded.sub.email : decoded.sub, 
            token: storedToken 
          });
        } else {
          console.warn("Subject not found in token payload:", decoded);
          localStorage.removeItem("token"); // Remove invalid token
        }
      } catch (error) {
        console.error("Error decoding token:", error);
        localStorage.removeItem("token");
      }
    }
  }, []);

  const login = (token) => {
    localStorage.setItem("token", token);
    try {
      const decoded = jwtDecode(token);
      console.log("Decoded Token on Login:", decoded); // Debugging

      // Updated to handle email directly in sub claim
      if (decoded.sub) {
        setUser({ 
          email: typeof decoded.sub === 'object' ? decoded.sub.email : decoded.sub, 
          token 
        });
      } else {
        console.warn("Subject not found in token payload:", decoded);
      }
    } catch (error) {
      console.error("Error decoding token:", error);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};





