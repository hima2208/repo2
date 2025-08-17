flowchart TD
  %% ========= CLIENT ENTRY POINTS =========
  A[React Frontend] -->|POST /generate-jupyter-url/{request_id}\n(or /framework/{framework})| B[JupyterService.generate_presigned_url]

  %% ========= GENERATE PRESIGNED URL =========
  subgraph S1[Generate Presigned URL]
    direction TB
    B --> B1[get_env_request_by_id(request_id)]
    B --> B2{framework provided?}
    B2 -- yes --> B3[normalize to lowercase]
    B2 -- no --> B4[read env_request.framework_option\nfallback: 'default']
    B3 --> B5[JupyterService.validate_framework]
    B4 --> B5
    B5 -- invalid --> E400[HTTP 400 Unsupported framework]
    B5 -- valid --> B6[JupyterService.get_framework_config]
    B6 --> B7[Create presigned_token = secrets.token_urlsafe(32)]
    B7 --> B8[expires_at = now + expiry_minutes]
    B8 --> B9[active_presigned_tokens[presigned_token] = {...}]
    B9 --> B10[Return JSON → presigned_url\n/jupyter-access/{presigned_token}\n+ metadata]
  end

  A -->|Open presigned_url| C[/GET /jupyter-access/{presigned_token}/] --> D[JupyterService.validate_and_access_jupyter]

  %% ========= VALIDATE & REDIRECT =========
  subgraph S2[Validate & Redirect]
    direction TB
    D --> D1{token exists?}
    D1 -- no --> E401a[401 Invalid token]
    D1 -- yes --> D2{now > expires_at?}
    D2 -- yes --> D3[delete token] --> E401b[401 Expired]
    D2 -- no --> D4[used_count++;\nlast_accessed=now]
    D4 --> D5[Read framework_config (base_url,\nnotebook_path, token?)]
    D5 --> D6{framework token set?}
    D6 -- yes --> D7[Build Jupyter URL:\n{base_url}/lab/tree/{notebook_path}?token=...]
    D6 -- no --> D8[Build Jupyter URL:\n{base_url}/lab/tree/{notebook_path}]
    D7 --> D9[[302 Redirect → JupyterLab]]
    D8 --> D9
  end

  %% ========= HEALTH CHECKS =========
  subgraph S3[Health Checks]
    direction TB
    H1[/GET /jupyter/health?framework/] --> H2[JupyterService.check_jupyter_health]
    H2 --> H3[httpx GET {base_url}/lab]
    H3 --> H4{status 200?}
    H4 -- yes --> H5[Return status: healthy]
    H4 -- no --> H6[Return status: unhealthy/timeout]

    HALL[/GET /jupyter/health/all/] --> H7[JupyterService.check_all_frameworks_health]
    H7 --> H8[For each framework → check_jupyter_health]
    H8 --> H9[Summarize overall_status: healthy/partial/unhealthy]
  end

  %% ========= SESSION MGMT =========
  subgraph S4[Session Management]
    direction TB
    SESS1[/GET /jupyter/sessions/] --> SESS2[get_active_sessions]
    SESS2 --> SESS3[Remove expired; return sessions]

    SESS5[/DELETE /jupyter/session/{token}/] --> SESS6[revoke_presigned_token]
    SESS6 --> SESS7{token exists?}
    SESS7 -- no --> E404a[404 Not found]
    SESS7 -- yes --> SESS8[Delete + return receipt]

    SESS9[/DELETE /jupyter/sessions/expired/] --> SESS10[cleanup_expired_tokens]
    SESS10 --> SESS11[Delete expired; return cleaned_up, remaining_active]
  end

  %% ========= CONFIG MGMT =========
  subgraph S5[Config Management]
    direction TB
    CFG1[/GET /jupyter/config/] --> C1[get_config → FRAMEWORK_CONFIGS,\nsupported_frameworks, default_expiry]

    CFG2[/GET /jupyter/config/framework/{fw}/] --> C2[get_framework_config]
    C2 --> C3{fw valid?}
    C3 -- no --> E400b[400 Unsupported]
    C3 -- yes --> C4[Return config]

    CFG3[/PUT /jupyter/config/framework/{fw}/] --> C5[update_framework_config]
    C5 --> C6[Update allowed fields\n(base_url, token, notebook_path)]

    CFG4[/POST /jupyter/config/framework/{fw}/] --> C7[add_framework\n(require base_url + notebook_path)]

    CFG5[/DELETE /jupyter/config/framework/{fw}/] --> C8[remove_framework]
    C8 --> C9{fw == default?}
    C9 -- yes --> E400c[400 Cannot remove default]
    C9 -- no --> C10[Delete + return removed_config]
  end
