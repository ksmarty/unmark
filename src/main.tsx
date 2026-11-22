import "@fontsource-variable/inter";
import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import App from "@/App";
import { installFavicon } from "@/lib/brand";
import "@/index.css";

installFavicon();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TooltipPrimitive.Provider delayDuration={200}>
      <App />
      <Toaster
        theme="dark"
        position="bottom-center"
        offset={{ bottom: 20, left: 16, right: 16 }}
        mobileOffset={{ bottom: 88, left: 12, right: 12 }}
        toastOptions={{
          style: {
            background: "#131319",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#f3f3f5",
            borderRadius: "14px",
          },
        }}
      />
    </TooltipPrimitive.Provider>
  </React.StrictMode>,
);
