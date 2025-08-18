// ModelTraining.tsx
import * as React from "react";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormLabel,
  Checkbox,
  Grid,
  Paper,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

type AlertState = { type: "success" | "error"; message: string } | null;

export default function ModelTraining() {
  const navigate = useNavigate();

  // Form state
  const [envName, setEnvName] = React.useState("");
  const [envPurpose, setEnvPurpose] = React.useState("");
  const [useCase, setUseCase] = React.useState("");
  const [dataDomain, setDataDomain] = React.useState("");
  const [selectedIDE, setSelectedIDE] = React.useState("jupyter");
  const [computeSize, setComputeSize] = React.useState("small");
  const [containerImages, setContainerImages] = React.useState<string[]>([]);

  // UX state
  const [loading, setLoading] = React.useState(false);
  const [alert, setAlert] = React.useState<AlertState>(null);

  // Toggle a framework key in containerImages
  const handleContainerImageChange = (image: string) => {
    setContainerImages((prev) =>
      prev.includes(image) ? prev.filter((i) => i !== image) : [...prev, image]
    );
  };

  const resetForm = () => {
    setEnvName("");
    setEnvPurpose("");
    setUseCase("");
    setDataDomain("");
    setSelectedIDE("jupyter");
    setComputeSize("small");
    setContainerImages([]);
    setAlert(null);
  };

  const handleCreate = async () => {
    // Basic required fields
    if (!envName || !envPurpose) {
      setAlert({ type: "error", message: "Env Name and Env Purpose are required" });
      return;
    }

    setLoading(true);
    setAlert(null);

    const formData = {
      env_name: envName,
      env_purpose: envPurpose,
      use_case: useCase,
      data_domain: dataDomain,
      instance_type: computeSize,
      ide_option: selectedIDE,
      framework_option: containerImages.join(","), // serialize array
      requested_by: "anonymous",
      status: "submitted",
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch("http://10.53.136.65:5000/env-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to create environment request");
      }

      const result = await response.json();
      const requestId: string | undefined = result?.request_id;

      if (!requestId) {
        throw new Error("Server did not return a request_id");
      }

      // Optionally show a brief success before navigating
      // setAlert({ type: "success", message: `Created! ID: ${requestId}` });

      // Navigate to the Welcome page and pass details we already have
      navigate(`/welcome/${requestId}`, {
        state: {
          requestId,
          envName,
          envPurpose,
          useCase,
          selectedIDE,
          computeSize,
          containerImages,
        },
      });
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setAlert({ type: "error", message: "Request timeout – please check your connection" });
      } else {
        setAlert({ type: "error", message: `Failed to create request: ${err?.message || err}` });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      maxWidth="xl"
      sx={{ ml: "240px", display: "flex", flexDirection: "column", height: "100vh", py: 4 }}
    >
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h5">
          <b>Request for Environment</b>
        </Typography>
      </Box>

      {/* Actions */}
      <Box mb={2}>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={loading}
          sx={{ mr: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : "Create"}
        </Button>

        <Button variant="outlined" onClick={resetForm} disabled={loading}>
          New Request
        </Button>
      </Box>

      {/* Alert */}
      {alert && (
        <Alert severity={alert.type} onClose={() => setAlert(null)} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      {/* Basic details */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Env Name"
              fullWidth
              required
              value={envName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnvName(e.target.value)}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Env Purpose"
              fullWidth
              required
              value={envPurpose}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnvPurpose(e.target.value)}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Use Case"
              fullWidth
              value={useCase}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUseCase(e.target.value)}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Data Domain"
              fullWidth
              value={dataDomain}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDataDomain(e.target.value)}
              disabled={loading}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Compute / IDE / Frameworks */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6} md={4}>
            <FormLabel>Compute</FormLabel>
            <RadioGroup
              value={computeSize}
              onChange={(e) => setComputeSize(e.target.value)}
            >
              {["small", "medium", "large"].map((size) => (
                <FormControlLabel
                  key={size}
                  value={size}
                  control={<Radio />}
                  label={size}
                  disabled={loading}
                />
              ))}
            </RadioGroup>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <FormLabel>IDE</FormLabel>
            <RadioGroup
              value={selectedIDE}
              onChange={(e) => setSelectedIDE(e.target.value)}
            >
              {["jupyter", "vscode", "sas", "studio"].map((ide) => (
                <FormControlLabel
                  key={ide}
                  value={ide}
                  control={<Radio />}
                  label={ide === "studio" ? "Sagemaker Studio" : ide.charAt(0).toUpperCase() + ide.slice(1)}
                  disabled={loading}
                />
              ))}
            </RadioGroup>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <FormLabel>Container Images</FormLabel>
            <Box>
              {[
                { key: "xgboost", label: "XGBoost 1.7" },
                { key: "tensorflow", label: "TensorFlow 2.13" },
                { key: "pytorch", label: "PyTorch 2.1" },
                { key: "custom", label: "Custom Container" },
              ].map((img) => (
                <FormControlLabel
                  key={img.key}
                  control={
                    <Checkbox
                      checked={containerImages.includes(img.key)}
                      onChange={() => handleContainerImageChange(img.key)}
                      disabled={loading}
                    />
                  }
                  label={img.label}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}
