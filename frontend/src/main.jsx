import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./context/AuthContext";
import { RoleProvider } from "./context/RoleContext";
import { ThemeProvider } from "./context/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RoleProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </RoleProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
