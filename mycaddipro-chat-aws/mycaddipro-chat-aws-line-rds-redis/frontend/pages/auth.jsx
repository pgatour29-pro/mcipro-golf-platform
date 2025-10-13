// Simple LINE Login link (stub). Finish code exchange on backend.
export default function Login() {
  const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER || 'https://access.line.me';
  const clientId = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || 'YOUR_LINE_CHANNEL_ID';
  const redirect = process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI || 'http://localhost:3000/auth/callback';
  const state = 'state-' + Math.random().toString(36).slice(2);
  const url = `${issuer}/oauth2/v2.1/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirect)}&state=${encodeURIComponent(state)}&scope=openid%20profile`;
  return (<main style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'Inter, system-ui', padding: 16 }}>
    <h1>Login</h1><a href={url}><button>Login with LINE</button></a>
  </main>);
}
