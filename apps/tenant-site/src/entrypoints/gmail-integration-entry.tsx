import React from "react";
import { createRoot } from "react-dom/client";
import IntegrationCard from "../components/integrations/IntegrationCard";

function GmailIntegrationSection() {
  const handleConnect = () => {
    window.location.href = "src/pages/api/gmail/auth.js";
  };

  const handleDisconnect = async () => {
    await fetch("/api/integrations/google/disconnect", { method: "POST" });
    alert("Disconnected Gmail account");
  };

  // Later, you can fetch Gmail connection status from Xano here
  const isConnected = false;

  return (
    <IntegrationCard
      provider="google"
      title="Gmail"
      description="Send and receive adoption application emails directly from Barkhaus."
      status={isConnected ? "connected" : "disconnected"}
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
    />
  );
}

createRoot(document.getElementById("gmail-integration-root")!).render(<GmailIntegrationSection />);
