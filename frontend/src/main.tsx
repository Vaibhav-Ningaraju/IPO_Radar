import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter } from 'react-router-dom';
import App from "./app/App.tsx";
import "./styles/index.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </GoogleOAuthProvider>
);
