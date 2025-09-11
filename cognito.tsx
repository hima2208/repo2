import React from "react";
import { Button, Box, Paper, Typography } from "@mui/material";
import { login, logout } from "./auth";
import { useAuth } from "./useAuth";
import { decodeIdToken } from "./decodeToken";

function App() {
  useAuth();
  const idToken = localStorage.getItem("id_token");
  const user = decodeIdToken();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f5f5f5",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: 400,
          borderRadius: "16px",
          textAlign: "center",
        }}
      >
        {!idToken ? (
          <>
            <Typography variant="h5" gutterBottom>
              Welcome 👋
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Please sign in to continue
            </Typography>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={login}
            >
              Login with Cognito
            </Button>
          </>
        ) : (
          <>
            <Typography variant="h6" gutterBottom>
              Welcome, {user?.given_name || user?.["cognito:username"]}
            </Typography>
            {user?.email && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {user.email}
              </Typography>
            )}
            <Button
              fullWidth
              variant="outlined"
              color="secondary"
              onClick={logout}
            >
              Logout
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
}

export default App;
