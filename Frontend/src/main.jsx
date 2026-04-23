// frontend/src/main.jsx
// The first JS file React runs. Mounts <App /> into the HTML page.
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./style.css";   // global styles

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);