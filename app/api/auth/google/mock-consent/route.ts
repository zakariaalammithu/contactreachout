import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get('state') || 'mock_state';
  const redirectUri = url.searchParams.get('redirect_uri') || '/api/auth/google/callback';

  // Render a 100% pixel-perfect accounts.google.com Account Chooser UI
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sign in - Google Accounts</title>
      <style>
        body {
          font-family: Roboto, Arial, sans-serif;
          background-color: #f0f4f9;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .card {
          background: #ffffff;
          border-radius: 28px;
          padding: 36px 40px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          box-sizing: border-box;
        }
        .logo-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 24px;
        }
        .logo-row svg {
          width: 24px;
          height: 24px;
        }
        .logo-row span {
          font-size: 15px;
          font-weight: 500;
          color: #1f1f1f;
        }
        h1 {
          font-size: 28px;
          font-weight: 400;
          color: #1f1f1f;
          margin: 0 0 6px 0;
        }
        p.subtitle {
          font-size: 14px;
          color: #444746;
          margin: 0 0 28px 0;
        }
        p.subtitle strong {
          color: #0b57d0;
        }
        .account-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border: 1px solid #e1e3e1;
          border-radius: 16px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: background-color 0.15s ease;
          text-decoration: none;
          color: inherit;
        }
        .account-item:hover {
          background-color: #f8fafd;
          border-color: #c4c7c5;
        }
        .account-info {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #007A55;
          color: white;
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .acc-name {
          font-size: 14px;
          font-weight: 600;
          color: #1f1f1f;
          margin: 0;
        }
        .acc-email {
          font-size: 12px;
          color: #5e5e5e;
          margin: 2px 0 0 0;
        }
        .acc-status {
          font-size: 11px;
          color: #747775;
        }
        .use-another {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border: 1px dashed #c4c7c5;
          border-radius: 16px;
          cursor: pointer;
          color: #1f1f1f;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
        }
        .use-another:hover {
          background-color: #f8fafd;
        }
        .icon-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #f0f4f9;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .terms {
          font-size: 12px;
          color: #747775;
          line-height: 1.5;
          margin-top: 28px;
        }
        .terms a {
          color: #0b57d0;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo-row">
          <svg viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          <span>Sign in with Google</span>
        </div>

        <h1>Choose an account</h1>
        <p class="subtitle">to continue to <strong>freeoutreach.com</strong></p>

        <!-- Account Option 1: Primary Browser User -->
        <a href="${redirectUri}?code=mock_code_alam&state=${state}&email=moumithu100@gmail.com&name=Alam" class="account-item">
          <div class="account-info">
            <div class="avatar" style="background-color: #007A55;">A</div>
            <div>
              <p class="acc-name">Alam</p>
              <p class="acc-email">moumithu100@gmail.com</p>
            </div>
          </div>
          <span class="acc-status">Signed out</span>
        </a>

        <!-- Account Option 2: Primary Super Admin -->
        <a href="${redirectUri}?code=mock_code_superadmin&state=${state}&email=mithusquare@gmail.com&name=Zakaria%20Alam%20Mithu" class="account-item">
          <div class="account-info">
            <div class="avatar" style="background-color: #6b21a8;">Z</div>
            <div>
              <p class="acc-name">Zakaria Alam Mithu</p>
              <p class="acc-email">mithusquare@gmail.com</p>
            </div>
          </div>
          <span class="acc-status">Signed out</span>
        </a>

        <!-- Custom Account Entry -->
        <a href="#" onclick="promptCustomEmail(event)" class="use-another">
          <div class="icon-circle">👤</div>
          <span>Use another account</span>
        </a>

        <p class="terms">
          Before using this app, you can review FreeOutreach's <a href="#">Privacy Policy</a> and <a href="#">Terms of Service</a>.
        </p>
      </div>

      <script>
        function promptCustomEmail(e) {
          e.preventDefault();
          const userEmail = prompt("Enter your Google Gmail address:", "user@gmail.com");
          if (userEmail && userEmail.includes("@")) {
            const name = userEmail.split("@")[0];
            window.location.href = "${redirectUri}?code=mock_code_custom&state=" + encodeURIComponent("${state}") + "&email=" + encodeURIComponent(userEmail) + "&name=" + encodeURIComponent(name);
          }
        }
      </script>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
