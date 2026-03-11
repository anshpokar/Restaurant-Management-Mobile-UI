import { createRoot } from "react-dom/client";
import { BrowserRouter } from 'react-router-dom';
import App from "./App.tsx";
import "./styles/index.css";

console.log("Rendering App...");
const container = document.getElementById("root");
if (!container) {
  console.error("Root container not found!");
} else {
  createRoot(container).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
