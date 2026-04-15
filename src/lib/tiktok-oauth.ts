import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────
//  ⚙️  CONFIG
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  tiktok: {
    appId:       process.env.TIKTOK_APP_ID || '7628504693093711873',
    appSecret:   process.env.TIKTOK_SECRET || '',
    redirectUri: process.env.APP_URL ? `${process.env.APP_URL}/api/tiktok/callback` : '',
  },
  firebase: {
    apiKey:      process.env.FIREBASE_API_KEY,
    authDomain:  process.env.FIREBASE_AUTH_DOMAIN,
    projectId:   process.env.FIREBASE_PROJECT_ID,
  },
};

// Initialize Firebase lazily
let _db: any;
function getDb() {
  if (_db) return _db;
  try {
    if (getApps().length > 0) {
      _db = getFirestore();
    } else if (CONFIG.firebase.apiKey) {
      const app = initializeApp(CONFIG.firebase);
      _db = getFirestore(app);
    }
  } catch (e) {
    console.error("TikTok OAuth: Firebase initialization failed", e);
  }
  return _db;
}

// ============================================================
//  1. HALAMAN UI  —  GET /tiktok/connect
// ============================================================
export function connectPageHTML({ advertiserId = '', error = '', connected = false } = {}) {
  const redirectUri = process.env.APP_URL 
    ? `${process.env.APP_URL}/api/tiktok/callback` 
    : '';
    
  const authUrl = `https://business-api.tiktok.com/portal/auth`
    + `?app_id=${CONFIG.tiktok.appId}`
    + `&state=${Date.now()}`
    + `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hubungkan TikTok Ads</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0f0f0f;--surface:#1a1a1a;--border:#2a2a2a;--text:#f0f0f0;--muted:#888;--red:#fe2c55;--red-dark:#c4143e;--teal:#25f4ee;--radius:12px}
body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:40px;width:100%;max-width:440px;text-align:center}
.logo{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:32px}
.logo-icon{width:40px;height:40px;background:var(--red);border-radius:10px;display:flex;align-items:center;justify-content:center}
.logo-icon svg{width:22px;height:22px;fill:white}
.logo-text{font-size:20px;font-weight:700}
.badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;font-size:13px;font-weight:500;margin-bottom:24px}
.badge.error{background:rgba(254,44,85,.15);color:var(--red);border:1px solid rgba(254,44,85,.3)}
.badge.success{background:rgba(37,244,238,.1);color:var(--teal);border:1px solid rgba(37,244,238,.25)}
.dot{width:7px;height:7px;border-radius:50%;background:currentColor;animation:pulse 1.5s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
h1{font-size:22px;font-weight:700;margin-bottom:10px;line-height:1.3}
p{color:var(--muted);font-size:14px;line-height:1.6;margin-bottom:28px}
.info{background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin-bottom:24px;text-align:left}
.info-row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0}
.info-row span:first-child{color:var(--muted)}
.info-row span:last-child{font-weight:500;font-family:monospace;font-size:12px}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px 24px;border-radius:var(--radius);border:none;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;text-decoration:none}
.btn-primary{background:var(--red);color:white}
.btn-primary:hover{background:var(--red-dark);transform:translateY(-1px)}
.btn-primary:active{transform:translateY(0)}
.btn-primary svg{width:18px;height:18px;fill:white}
.btn-secondary{background:transparent;color:var(--muted);border:1px solid var(--border);font-size:14px;padding:11px 24px;margin-top:12px}
.btn-secondary:hover{background:rgba(255,255,255,.05);color:var(--text)}
.divider{display:flex;align-items:center;gap:12px;margin:20px 0}
.divider hr{flex:1;border:none;border-top:1px solid var(--border)}
.divider span{color:var(--muted);font-size:12px}
.check{width:56px;height:56px;background:rgba(37,244,238,.1);border:2px solid var(--teal);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
.check svg{width:28px;height:28px;stroke:var(--teal);fill:none;stroke-width:2.5}
.note{margin-top:24px;font-size:12px;color:var(--muted);line-height:1.5}
.note a{color:var(--red);text-decoration:none}
.error-msg{background:rgba(254,44,85,.1);border:1px solid rgba(254,44,85,.25);color:#ff6b81;padding:10px 14px;border-radius:var(--radius);font-size:13px;margin-bottom:20px}
</style>
</head>
<body>
<div class="card">
${connected ? `
  <div class="check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
  <div class="badge success"><span class="dot" style="animation:none;opacity:1"></span> Terhubung</div>
  <h1>TikTok Ads Berhasil Terhubung!</h1>
  <p>Akun Anda telah terhubung kembali. Data laporan akan segera tersedia.</p>
  <div class="info">
    <div class="info-row"><span>Advertiser ID</span><span>${advertiserId || '—'}</span></div>
    <div class="info-row"><span>Token disimpan</span><span style="color:var(--teal)">Firebase ✓</span></div>
  </div>
  <a href="/" class="btn btn-primary" style="color:white">Kembali ke Dashboard</a>
` : `
  <div class="logo">
    <div class="logo-icon"><svg viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/></svg></div>
    <span class="logo-text">TikTok Ads</span>
  </div>
  <div class="badge error"><span class="dot"></span> Token tidak valid atau kedaluwarsa</div>
  <h1>Hubungkan Ulang Akun TikTok Anda</h1>
  <p>Sesi TikTok Ads Anda telah berakhir. Hubungkan ulang untuk melanjutkan mengambil data laporan.</p>
  ${error ? `<div class="error-msg">⚠ ${error}</div>` : ''}
  <div class="info">
    <div class="info-row"><span>Advertiser ID</span><span>${advertiserId || 'Semua akun'}</span></div>
    <div class="info-row"><span>Status</span><span style="color:var(--red)">Access token revoked</span></div>
  </div>
  <a href="${authUrl}" class="btn btn-primary">
    <svg viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/></svg>
    Hubungkan Ulang TikTok
  </a>
  <div class="divider"><hr><span>atau</span><hr></div>
  <a href="/" class="btn btn-secondary">Kembali ke Dashboard</a>
  <p class="note">Anda akan diarahkan ke TikTok untuk memberikan izin akses.<br>
  <a href="#">Pelajari lebih lanjut tentang izin yang diperlukan</a></p>
`}
</div>
<script>
  // If in popup, notify parent
  if (window.opener && ${connected}) {
    window.opener.postMessage({ 
      type: 'TIKTOK_OAUTH_SUCCESS', 
      payload: { 
        advertiser_ids: '${advertiserId}' 
      } 
    }, '*');
    setTimeout(() => window.close(), 2000);
  }
</script>
</body>
</html>`;
}

// ============================================================
//  2. OAUTH CALLBACK
// ============================================================
export async function handleCallback(req: any, res: any) {
  const { code, error, error_description } = req.query;

  if (error) {
    console.error('[TikTok OAuth] Error:', error, error_description);
    return res.send(connectPageHTML({ error: error_description || error }));
  }

  if (!code) {
    return res.send(connectPageHTML({ error: 'Authorization code tidak ditemukan' }));
  }

  try {
    const tokenRes = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id:     CONFIG.tiktok.appId,
        secret:     CONFIG.tiktok.appSecret,
        auth_code:  code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.code !== 0) {
      throw new Error(tokenData.message || 'Gagal menukar kode dengan token');
    }

    const { access_token, advertiser_ids, scope } = tokenData.data;

    // Simpan token ke Firebase
    const db = getDb();
    if (db) {
      await Promise.all(
        advertiser_ids.map((advertiserId: any) =>
          setDoc(
            doc(db, 'tiktok_tokens', String(advertiserId)),
            {
              access_token,
              advertiser_id: String(advertiserId),
              scope,
              status:       'active',
              connected_at: serverTimestamp(),
            },
            { merge: true }
          )
        )
      );
    }

    console.log('[TikTok OAuth] Token disimpan untuk:', advertiser_ids);

    const firstId = advertiser_ids[0] || '';
    return res.send(connectPageHTML({ connected: true, advertiserId: advertiser_ids.join(",") }));

  } catch (err: any) {
    console.error('[TikTok OAuth] Exception:', err.message);
    return res.send(connectPageHTML({ error: err.message }));
  }
}

// ============================================================
//  3. FIREBASE TOKEN MANAGER
// ============================================================

export async function getToken(advertiserId: string) {
  const db = getDb();
  if (!db) throw new Error("Firebase not initialized");
  const snap = await getDoc(doc(db, 'tiktok_tokens', String(advertiserId)));

  if (!snap.exists()) throw new TikTokTokenError('not_found', advertiserId);

  const data = snap.data();
  if (data.status === 'revoked' || data.status === 'invalid') {
    throw new TikTokTokenError('revoked', advertiserId);
  }
  if (!data.access_token) throw new TikTokTokenError('not_found', advertiserId);

  return data.access_token;
}

export async function revokeToken(advertiserId: string) {
  const db = getDb();
  if (!db) return;
  await updateDoc(doc(db, 'tiktok_tokens', String(advertiserId)), {
    status:     'revoked',
    revoked_at: serverTimestamp(),
  });
  console.warn('[TikTok Token] Revoked:', advertiserId);
}

export async function fetchTikTokAPI(advertiserId: string, endpoint: string, params: any = {}, method = 'GET') {
  const token = await getToken(advertiserId);

  const BASE = 'https://business-api.tiktok.com/open_api/v1.3';
  let url = `${BASE}${endpoint}`;

  const options: any = {
    method,
    headers: {
      'Access-Token':   token,
      'Content-Type':   'application/json',
    },
  };

  if (method === 'GET') {
    url += '?' + new URLSearchParams({ advertiser_id: advertiserId, ...params });
  } else {
    options.body = JSON.stringify({ advertiser_id: advertiserId, ...params });
  }

  const res  = await fetch(url, options);
  const data = await res.json();

  if (data.code === 40001 || data.message?.toLowerCase().includes('access token')) {
    await revokeToken(advertiserId);
    throw new TikTokTokenError('revoked', advertiserId, data.message);
  }

  if (data.code !== 0) {
    throw new Error(`TikTok API Error ${data.code}: ${data.message}`);
  }

  return data.data;
}

export class TikTokTokenError extends Error {
  type: string;
  advertiserId: string;
  reconnectUrl: string;
  
  constructor(type: string, advertiserId: string, detail = '') {
    const msg = type === 'not_found'
      ? `Token untuk advertiser ${advertiserId} tidak ditemukan.`
      : `Token untuk advertiser ${advertiserId} tidak valid atau telah dicabut. ${detail}`.trim();
    super(msg);
    this.name         = 'TikTokTokenError';
    this.type         = type;
    this.advertiserId = advertiserId;
    this.reconnectUrl = '/tiktok/connect';
  }
}
