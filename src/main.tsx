import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initStudioDraftPersistence } from "./store/studioDraft";

initStudioDraftPersistence();

createRoot(document.getElementById("root")!).render(<App />);
