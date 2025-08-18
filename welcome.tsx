// Welcome.tsx
import * as React from "react";
import {
  Container, Paper, Box, Typography, Button, Alert,
  CircularProgress,
} from "@mui/material";
import { useLocation, useParams } from "react-router-dom";

type LocState = {
  requestId?: string;
  envName?: string;
  envPurpose?: string;
  useCase?: string;
  selectedIDE?: string;
  // optional: jupyterUrl?: string; jupyterExpiry?: string;
};

export default function Welcome() {
  const { requestId: requestIdFromParams } = useParams();
  const location = useLocation();
  const state = (location.state || {}) as LocState;

  // Prefer param (URL is the source of truth), fall back to state
  const requestId = requestIdFromParams || state.requestId || "";

  const [jupyterUrl, setJupyterUrl] = React.useState<string | null>(null);
  const [expiryIso, setExpiryIso] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [alert, setAlert] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Compute human-readable expiry + countdown (optional)
  const readableExpiry = React.useMemo(
    () => (expiryIso ? new Date(expiryIso).toLocaleString() : null),
    [expiryIso]
  );

  // Optional: live countdown
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    if (!expiryIso) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiryIso]);
  const secondsLeft = React.useMemo(() => {
    if (!expiryIso) return null;
    return Math.max(0, Math.floor((new Date(expiryIso).getTime() - now) / 1000));
  }, [expiryIso, now]);

  const handleGenerateJupyter = async (minutes = 30) => {
    if (!requestId) {
      setAlert({ type: "error", message: "Missing request id" });
      return;
    }
    try {
      setLoading(true);
      setAlert(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const url = `http://10.53.136.65:5000/generate-jupyter-url/${requestId}?expiry_minutes=${minutes}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const json = await res.json();
      const data = json?.data;
      if (!data?.presigned_url || !data?.expires_at) {
        throw new Error("Invalid server response");
      }

      setJupyterUrl(data.presigned_url);
      setExpiryIso(data.expires_at);
      setAlert({ type: "success", message: "Jupyter URL generated!" });
    } catch (e: any) {
      if (e?.name === "AbortError") {
        setAlert({ type: "error", message: "Timeout – please try again" });
      } else {
        setAlert({ type: "error", message: `Failed to generate URL: ${e?.message || e}` });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenJupyter = () => {
    if (!jupyterUrl) return;
    window.open(jupyterUrl, "_blank", "noopener,noreferrer");
    // Note: we KEEP this page open for the enhanced UX you want
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Welcome</Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Environment Details</Typography>
        <Box sx={{ mt: 1 }}>
          <Typography><strong>Request ID:</strong> {requestId}</Typography>
          <Typography><strong>Name:</strong> {state.envName || "—"}</Typography>
          <Typography><strong>Purpose:</strong> {state.envPurpose || "—"}</Typography>
          <Typography><strong>Use Case:</strong> {state.useCase || "—"}</Typography>
          <Typography><strong>IDE:</strong> {state.selectedIDE || "—"}</Typography>
        </Box>
      </Paper>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Actions</Typography>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            onClick={() => handleGenerateJupyter(30)}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : "Generate Jupyter Access"}
          </Button>

          <Button
            variant="outlined"
            onClick={handleOpenJupyter}
            disabled={!jupyterUrl}
          >
            Open Jupyter Lab
          </Button>

          <Button
            variant="outlined"
            onClick={() => jupyterUrl && navigator.clipboard.writeText(jupyterUrl)}
            disabled={!jupyterUrl}
          >
            Copy URL
          </Button>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Presigned URL:</strong> {jupyterUrl || "—"}
          </Typography>
          <Typography variant="body2">
            <strong>Valid until:</strong> {readableExpiry || "—"}
            {secondsLeft !== null && `  (T–${secondsLeft}s)`}
          </Typography>
        </Box>
      </Paper>

      {/* Optional: fast test buttons for expiry */}
      <Paper elevation={0} sx={{ p: 0 }}>
        <Typography variant="body2" color="text.secondary">
          For testing: you can generate with a short TTL (e.g., 1 minute) by calling{" "}
          <Button size="small" onClick={() => handleGenerateJupyter(1)} disabled={loading}>
            Generate 1-min URL
          </Button>
        </Typography>
      </Paper>
    </Container>
  );
}
