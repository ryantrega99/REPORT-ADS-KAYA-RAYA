import express from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from './src/firebase-config.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;
let auth: any;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel ? path.join("/tmp", "data") : path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const CAMPAIGNS_FILE = path.join(DATA_DIR, "campaigns.json");

// In-memory cache (synced with Firestore)
let memoryUsers: any[] = [];
let memoryData: any = {};

async function initFirebase() {
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);

    console.log("Firebase initialized successfully using bundled config.");

    // Sign in server to allow Firestore writes
    const adminEmail = "lkbimrbob@gmail.com";
    const adminPass = "kayaraya123";

    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPass);
      console.log("Server signed in to Firebase successfully.");
    } catch (err) {
      console.warn("Server failed to sign in to Firebase (this is expected if Email/Pass auth is not enabled):", err);
    }
    return true;
  } catch (err) {
    console.error("Failed to initialize Firebase:", err);
    return false;
  }
}

async function ensureDataDir() {
  if (!db) return;
  try {
    console.log("Loading data from Firestore...");
    // 1. Load from Firestore (Primary Source)
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      memoryUsers = usersSnap.docs.map(doc => doc.data());
      console.log(`Loaded ${memoryUsers.length} users from Firestore.`);
    } catch (err) {
      console.error("Error loading users from Firestore:", err);
    }

    try {
      const campaignsSnap = await getDocs(collection(db, 'campaigns'));
      const campaigns = campaignsSnap.docs.map(doc => doc.data());
      memoryData = {}; // Reset before reload
      campaigns.forEach((c: any) => {
        if (c.user_id) {
          if (!memoryData[c.user_id]) memoryData[c.user_id] = { campaigns: [] };
          memoryData[c.user_id].campaigns.push(c);
        }
      });
      console.log(`Loaded ${campaigns.length} campaigns from Firestore.`);
    } catch (err) {
      console.error("Error loading campaigns from Firestore:", err);
    }

    // 2. Always ensure super admin
    const adminEmail = "lkbimrbob@gmail.com";
    const adminPass = "kayaraya123";
    const adminIdx = memoryUsers.findIndex((u: any) => u.email === adminEmail);

    if (adminIdx === -1) {
      const superAdmin = {
        id: "super-admin",
        name: "Super Admin",
        email: adminEmail,
        pass: adminPass,
        role: "admin",
        color: "#4f46e5",
        initials: "SA",
        status: "Aktif",
        createdAt: new Date().toISOString(),
        assignedProducts: [],
        assignedFBAccounts: [],
        assignedGAdsAccounts: []
      };
      memoryUsers.push(superAdmin);
      await setDoc(doc(db, 'users', 'super-admin'), superAdmin);
      console.log("Super Admin created in Firestore.");
    } else {
      memoryUsers[adminIdx].pass = adminPass;
      memoryUsers[adminIdx].role = "admin";
      // Update Firestore if needed
      await updateDoc(doc(db, 'users', memoryUsers[adminIdx].id), { 
        pass: adminPass, 
        role: "admin" 
      }).catch(() => {});
    }

    // 3. Local filesystem backup (optional, for non-Vercel)
    if (!isVercel) {
      await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
      await fs.writeFile(USERS_FILE, JSON.stringify(memoryUsers, null, 2)).catch(() => {});
      await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify(memoryData, null, 2)).catch(() => {});
    }
  } catch (err) {
    console.warn("Initialization warning:", err);
  }
}

async function performInit() {
  if (isInitialized) return;
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    await initFirebase();
    await ensureDataDir();
    isInitialized = true;
    initPromise = null;
  })();
  
  return initPromise;
}

const app = express();

async function startServer() {
  await performInit();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Middleware to ensure initialization
  app.use(async (req, res, next) => {
    if (!isInitialized) {
      await performInit();
    }
    next();
  });

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ 
      ok: true, 
      status: "running", 
      initialized: isInitialized,
      usersCount: memoryUsers.length,
      vercel: isVercel,
      time: new Date().toISOString()
    });
  });

  // --- Auth & User Management ---

  app.post("/api/auth/login", async (req, res) => {
    try {
      let { email, password } = req.body;
      console.log(`Login attempt for: ${email}`);
      
      if (!email || !password) {
        return res.status(400).json({ ok: false, error: "Email dan password wajib diisi" });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanPass = password.trim();

      // Hardcoded fail-safe for super admin to ensure access
      if (cleanEmail === "lkbimrbob@gmail.com" && cleanPass === "kayaraya123") {
        console.log("Super Admin hardcoded login successful.");
        let admin = memoryUsers.find((u: any) => u.email === cleanEmail);
        if (!admin) {
          admin = {
            id: "super-admin",
            name: "Super Admin",
            email: cleanEmail,
            role: "admin",
            color: "#4f46e5",
            initials: "SA",
            status: "Aktif",
            createdAt: new Date().toISOString(),
            assignedProducts: [],
            assignedFBAccounts: [],
            assignedGAdsAccounts: []
          };
        }
        const { pass, ...userWithoutPass } = admin;
        return res.json({ ok: true, user: userWithoutPass });
      }

      console.log(`Checking memoryUsers (count: ${memoryUsers.length}) for user...`);
      const user = memoryUsers.find((u: any) => u.email.toLowerCase() === cleanEmail && u.pass === cleanPass);
      
      if (user) {
        console.log(`Login successful for user: ${email}`);
        const { pass, ...userWithoutPass } = user;
        res.json({ ok: true, user: userWithoutPass });
      } else {
        console.log(`Login failed for user: ${email}. User not found or password incorrect.`);
        res.status(401).json({ ok: false, error: "Email atau password salah" });
      }
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ ok: false, error: "Server error" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      
      if (memoryUsers.find((u: any) => u.email === email)) {
        return res.status(400).json({ ok: false, error: "Email sudah terdaftar" });
      }

      const newUser = {
        id: Math.random().toString(36).substring(2, 9),
        name,
        email,
        pass: password,
        role: "user",
        color: "#" + Math.floor(Math.random()*16777215).toString(16),
        initials: name.split(" ").map((n: string) => n[0]).join("").toUpperCase(),
        status: "Aktif",
        createdAt: new Date().toISOString()
      };

      memoryUsers.push(newUser);
      
      // Persist to Firestore
      await setDoc(doc(db, 'users', newUser.id), newUser);

      try {
        await fs.writeFile(USERS_FILE, JSON.stringify(memoryUsers, null, 2));
      } catch (e) {}
      
      const { pass, ...userWithoutPass } = newUser;
      res.json({ ok: true, user: userWithoutPass });
    } catch (err) {
      res.status(500).json({ ok: false, error: "Server error" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const safeUsers = memoryUsers.map(({ pass, ...u }: any) => u);
      res.json({ ok: true, users: safeUsers });
    } catch (err) {
      res.status(500).json({ ok: false, error: "Server error" });
    }
  });

  app.post("/api/users/add", async (req, res) => {
    try {
      const newUser = req.body;
      if (!newUser.email) {
        return res.status(400).json({ ok: false, error: "Email wajib diisi" });
      }

      if (memoryUsers.find((u: any) => u.email.toLowerCase() === newUser.email.toLowerCase())) {
        return res.status(400).json({ ok: false, error: "Email sudah terdaftar" });
      }

      memoryUsers.push(newUser);
      
      // Persist to Firestore
      await setDoc(doc(db, 'users', newUser.id), newUser);

      try {
        await fs.writeFile(USERS_FILE, JSON.stringify(memoryUsers, null, 2));
      } catch (e) {}
      
      res.json({ ok: true });
    } catch (err) {
      console.error("Add user error:", err);
      res.status(500).json({ ok: false, error: "Server error" });
    }
  });

  app.post("/api/users/update", async (req, res) => {
    try {
      const updatedUser = req.body;
      const idx = memoryUsers.findIndex((u: any) => u.id === updatedUser.id);
      
      if (idx !== -1) {
        if (!updatedUser.pass) updatedUser.pass = memoryUsers[idx].pass;
        memoryUsers[idx] = { ...memoryUsers[idx], ...updatedUser };
        
        // Persist to Firestore
        await setDoc(doc(db, 'users', updatedUser.id), memoryUsers[idx]);

        try {
          await fs.writeFile(USERS_FILE, JSON.stringify(memoryUsers, null, 2));
        } catch (e) {}
        res.json({ ok: true });
      } else {
        res.status(404).json({ ok: false, error: "User not found" });
      }
    } catch (err) {
      res.status(500).json({ ok: false, error: "Server error" });
    }
  });

  app.post("/api/users/delete", async (req, res) => {
    try {
      const { id } = req.body;
      console.log(`Attempting to delete user with ID: ${id}`);
      
      if (id === "super-admin") {
        return res.status(400).json({ ok: false, error: "Super Admin tidak bisa dihapus" });
      }

      const idx = memoryUsers.findIndex((u: any) => u.id === id);
      if (idx !== -1) {
        const deletedUser = memoryUsers[idx];
        memoryUsers.splice(idx, 1);
        console.log(`User ${deletedUser.email} removed from memory.`);
        
        // Delete from Firestore
        await deleteDoc(doc(db, 'users', id));
        console.log(`User ${id} deleted from Firestore.`);

        try {
          await fs.writeFile(USERS_FILE, JSON.stringify(memoryUsers, null, 2));
        } catch (e) {}
        res.json({ ok: true });
      } else {
        console.log(`User with ID ${id} not found in memoryUsers.`);
        res.status(404).json({ ok: false, error: "User not found" });
      }
    } catch (err) {
      console.error("Delete user error:", err);
      res.status(500).json({ ok: false, error: "Server error" });
    }
  });

  // --- Campaign Data Management ---

  app.get("/api/data", async (req, res) => {
    try {
      res.json({ ok: true, data: memoryData });
    } catch (err) {
      res.status(500).json({ ok: false, error: "Server error" });
    }
  });

  app.post("/api/data", async (req, res) => {
    try {
      const { userId, campaigns } = req.body;
      memoryData[userId] = { campaigns };
      
      // Persist to Firestore (Individual campaigns)
      for (const c of campaigns) {
        const campaignId = String(c.id || Math.random().toString(36).substring(2, 9));
        await setDoc(doc(db, 'campaigns', campaignId), { ...c, id: campaignId });
      }

      try {
        await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify(memoryData, null, 2));
      } catch (e) {}
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: "Server error" });
    }
  });

  // --- Facebook Ads Proxy ---

  app.post("/api/fb-ads", async (req, res) => {
    try {
      const { accountId, token, datePreset, startDate, endDate } = req.body;
      
      const params: any = {
        level: 'campaign',
        fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,actions',
        access_token: token,
        limit: '100'
      };

      if (datePreset === 'custom') {
        params.time_range = JSON.stringify({ since: startDate, until: endDate });
      } else {
        params.date_preset = datePreset;
      }

      const url = `https://graph.facebook.com/v21.0/${accountId}/insights?` + new URLSearchParams(params).toString();
      const fbRes = await fetch(url);
      const result = await fbRes.json();
      
      if (result.error) {
        return res.status(400).json({ ok: false, error: result.error.message });
      }
      
      res.json({ ok: true, data: result.data });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // --- WhatsApp (Fonnte) Proxy ---

  app.post("/api/wa/send", async (req, res) => {
    try {
      const { target, message, token } = req.body;
      const waToken = token || process.env.WA_TOKEN;

      if (!waToken) {
        return res.status(400).json({ ok: false, error: "WhatsApp Token is missing" });
      }

      const waRes = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: { "Authorization": waToken },
        body: new URLSearchParams({ target, message })
      });
      
      const result = await waRes.json();
      res.json({ ok: result.status, message: result.reason || "Sent" });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // API Route for Google Ads
  app.post("/api/google-ads", async (req, res) => {
    try {
      const { customerId, dateRange, startDate, endDate } = req.body;

      if (!customerId) {
        return res.status(400).json({ ok: false, error: "Customer ID is required" });
      }

      const CLIENT_ID = process.env.GADS_CLIENT_ID;
      const CLIENT_SECRET = process.env.GADS_CLIENT_SECRET;
      const REFRESH_TOKEN = process.env.GADS_REFRESH_TOKEN;
      const DEVELOPER_TOKEN = process.env.GADS_DEVELOPER_TOKEN;
      const MCC_ID = process.env.GADS_MCC_ID;

      if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !DEVELOPER_TOKEN) {
        return res.status(500).json({ 
          ok: false, 
          error: "Server configuration missing Google Ads credentials (ClientID, Secret, RefreshToken, or DevToken). Please set them in the environment variables." 
        });
      }

      // 1. Get Access Token
      const cleanId = (CLIENT_ID || "").replace(/\s+/g, '').replace(/^["']|["']$/g, '');
      const cleanSecret = (CLIENT_SECRET || "").replace(/\s+/g, '').replace(/^["']|["']$/g, '');
      const cleanRefresh = (REFRESH_TOKEN || "").replace(/\s+/g, '').replace(/^["']|["']$/g, '');

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: cleanId,
          client_secret: cleanSecret,
          refresh_token: cleanRefresh,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenResponse.json();
      if (tokenData.error) {
        let errorMsg = `OAuth Error: ${tokenData.error} - ${tokenData.error_description || 'No description'}`;
        if (tokenData.error === 'unauthorized_client') {
          errorMsg = `Gagal: OAuth Error: unauthorized_client. Detail: ${tokenData.error_description || 'No description'}. Pastikan Anda men-generate Refresh Token menggunakan Client ID yang SAMA dengan yang ada di pengaturan ini.`;
        } else if (tokenData.error === 'invalid_client') {
          errorMsg = `Gagal: OAuth Error: invalid_client. Detail: ${tokenData.error_description || 'No description'}. Client ID atau Client Secret salah.`;
        } else if (tokenData.error === 'invalid_grant') {
          errorMsg = `Gagal: OAuth Error: invalid_grant. Detail: ${tokenData.error_description || 'No description'}. Refresh token tidak valid atau sudah dicabut.`;
        }
        return res.status(401).json({ ok: false, error: errorMsg });
      }
      const accessToken = tokenData.access_token;
      const cleanCustomerId = String(customerId).replace(/\D/g, "");
      const cleanMccId = MCC_ID ? String(MCC_ID).replace(/\D/g, "") : "";

      // 2. Fetch Data from Google Ads using the library
      const { GoogleAdsApi } = await import("google-ads-api");
      const client = new GoogleAdsApi({
        client_id: cleanId,
        client_secret: cleanSecret,
        developer_token: DEVELOPER_TOKEN.trim(),
      });

      // Helper to fetch campaigns for a specific customer ID
      async function fetchCampaignsForCustomer(targetId: string, loginId?: string) {
        const customer = client.Customer({
          customer_id: targetId,
          login_customer_id: loginId,
          refresh_token: cleanRefresh,
        });

        // Get customer descriptive name first
        let accountName = targetId;
        try {
          const info = await customer.query(`SELECT customer.descriptive_name FROM customer LIMIT 1`);
          accountName = info[0]?.customer?.descriptive_name || targetId;
        } catch (e) {
          console.warn(`Could not fetch name for ${targetId}`);
        }

        let dateQuery = `segments.date DURING ${dateRange || "LAST_7_DAYS"}`;
        if (dateRange === "CUSTOM" && startDate && endDate) {
          const formattedStart = startDate.length === 8 
            ? `${startDate.substring(0, 4)}-${startDate.substring(4, 6)}-${startDate.substring(6, 8)}`
            : startDate;
          const formattedEnd = endDate.length === 8 
            ? `${endDate.substring(0, 4)}-${endDate.substring(4, 6)}-${endDate.substring(6, 8)}`
            : endDate;
          dateQuery = `segments.date BETWEEN '${formattedStart}' AND '${formattedEnd}'`;
        }

        const query = `
          SELECT 
            campaign.id, 
            campaign.name, 
            campaign.status,
            campaign.advertising_channel_type,
            metrics.cost_micros, 
            metrics.conversions, 
            metrics.impressions, 
            metrics.clicks, 
            metrics.ctr,
            metrics.average_cpc,
            metrics.conversions_from_interactions_rate,
            segments.date 
          FROM campaign 
          WHERE campaign.status != 'REMOVED' 
          AND ${dateQuery}
        `;
        
        const results = await customer.query(query);
        return results
          .filter((row: any) => row.campaign.status === 'ENABLED' || (row.metrics.cost_micros && row.metrics.cost_micros > 0))
          .map((row: any) => ({
            id: row.campaign.id,
            name: row.campaign.name,
            status: row.campaign.status,
            advertisingChannelType: row.campaign.advertising_channel_type,
            account_name: accountName,
            account_id: targetId,
            platform: "google",
            product: "Umum",
            spend: Math.round(row.metrics.cost_micros / 1000000) || 0,
            conversions: row.metrics.conversions || 0,
            impressions: row.metrics.impressions || 0,
            clicks: row.metrics.clicks || 0,
            ctr: (row.metrics.ctr * 100).toFixed(2) + '%',
            averageCpc: 'Rp ' + Math.round(row.metrics.average_cpc / 1000000).toLocaleString('id-ID'),
            conversionsFromInteractionsRate: (row.metrics.conversions_from_interactions_rate * 100).toFixed(2) + '%',
            tanggal: row.segments.date,
          }));
      }

      let allCampaigns: any[] = [];
      let fetchError: any = null;

      // Try direct fetch first
      try {
        allCampaigns = await fetchCampaignsForCustomer(cleanCustomerId, (cleanMccId && cleanMccId !== cleanCustomerId) ? cleanMccId : undefined);
      } catch (err: any) {
        // If it's a manager account error, try fetching sub-accounts
        const errStr = JSON.stringify(err).toLowerCase();
        const errMsg = (err.message || "").toLowerCase();
        
        let isManagerError = 
          errMsg.includes("manager account") || 
          errStr.includes("metrics_cannot_be_requested_for_a_manager_account") ||
          errStr.includes("manager_account") ||
          errMsg.includes("separate requests against each client account");

        // Check nested errors array if it exists
        if (!isManagerError && err.errors && Array.isArray(err.errors)) {
          for (const e of err.errors) {
            const m = (e.message || "").toLowerCase();
            if (m.includes("manager account") || m.includes("separate requests against each client account")) {
              isManagerError = true;
              break;
            }
          }
        }

        if (isManagerError) {
          console.log(`Account ${cleanCustomerId} is a Manager Account (detected from error). Fetching sub-accounts...`);
          
          const managerClient = client.Customer({
            customer_id: cleanCustomerId,
            login_customer_id: (cleanMccId && cleanMccId !== cleanCustomerId) ? cleanMccId : undefined,
            refresh_token: cleanRefresh,
          });

          // Fetch sub-accounts (direct children that are not managers)
          const subAccounts = await managerClient.query(`
            SELECT 
              customer_client.id, 
              customer_client.descriptive_name, 
              customer_client.manager 
            FROM customer_client 
            WHERE customer_client.level = 1 
            AND customer_client.manager = false
            AND customer_client.status = 'ENABLED'
          `);

          console.log(`Found ${subAccounts.length} sub-accounts for MCC ${cleanCustomerId}`);
          
          const batchSize = 5;
          for (let i = 0; i < subAccounts.length; i += batchSize) {
            const batch = subAccounts.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (sub: any) => {
              try {
                return await fetchCampaignsForCustomer(sub.customer_client.id, cleanCustomerId);
              } catch (subErr) {
                console.error(`Failed to fetch campaigns for sub-account ${sub.customer_client.id}:`, subErr);
                return [];
              }
            }));
            allCampaigns = allCampaigns.concat(...batchResults);
          }
        } else {
          // Re-throw if it's some other error
          throw err;
        }
      }

      res.json({ ok: true, campaigns: allCampaigns });
    } catch (error: any) {
      console.error("Google Ads API Error Detail:", error);
      let errorMsg = "Unknown Google Ads API error";
      
      if (typeof error === 'string') {
        errorMsg = error;
      } else if (error.message && typeof error.message === 'string') {
        errorMsg = error.message;
      } else if (error.errors && error.errors.length > 0) {
        errorMsg = error.errors[0].message || JSON.stringify(error.errors[0]);
      } else {
        try {
          errorMsg = JSON.stringify(error);
        } catch (e) {
          errorMsg = String(error);
        }
      }

      if (errorMsg.includes("The caller does not have permission")) {
        errorMsg = "GAds Error: 'The caller does not have permission'. Ini berarti email Anda tidak punya akses ke akun ini, atau MCC ID (Manager ID) salah/tidak terhubung ke akun ini.";
      }
      
      res.status(500).json({ ok: false, error: errorMsg });
    }
  });

  // API Route to test Google Ads connection
  app.get("/api/google-ads/test", async (req, res) => {
    try {
      const CLIENT_ID = process.env.GADS_CLIENT_ID;
      const CLIENT_SECRET = process.env.GADS_CLIENT_SECRET;
      const REFRESH_TOKEN = process.env.GADS_REFRESH_TOKEN;

      if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
        return res.status(500).json({ ok: false, error: "Missing credentials in environment variables." });
      }

      const cleanId = (CLIENT_ID || "").replace(/\s+/g, '').replace(/^["']|["']$/g, '');
      const cleanSecret = (CLIENT_SECRET || "").replace(/\s+/g, '').replace(/^["']|["']$/g, '');
      const cleanRefresh = (REFRESH_TOKEN || "").replace(/\s+/g, '').replace(/^["']|["']$/g, '');

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: cleanId,
          client_secret: cleanSecret,
          refresh_token: cleanRefresh,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenResponse.json();
      if (tokenData.error) {
        let errorMsg = `OAuth Error: ${tokenData.error} - ${tokenData.error_description || 'No description'}`;
        if (tokenData.error === 'unauthorized_client') {
          errorMsg = `Gagal: OAuth Error: unauthorized_client. Detail: ${tokenData.error_description || 'No description'}. Pastikan Anda men-generate Refresh Token menggunakan Client ID yang SAMA dengan yang ada di pengaturan ini.`;
        } else if (tokenData.error === 'invalid_client') {
          errorMsg = `Gagal: OAuth Error: invalid_client. Detail: ${tokenData.error_description || 'No description'}. Client ID atau Client Secret salah.`;
        } else if (tokenData.error === 'invalid_grant') {
          errorMsg = `Gagal: OAuth Error: invalid_grant. Detail: ${tokenData.error_description || 'No description'}. Refresh token tidak valid atau sudah dicabut.`;
        }
        return res.status(401).json({ ok: false, error: errorMsg });
      }

      res.json({ ok: true, message: "Koneksi berhasil", token_status: "valid" });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // API 404 handler - must be before SPA fallback
    app.all("/api/*", (req, res) => {
      res.status(404).json({ ok: false, error: `API route ${req.url} not found` });
    });

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global error:", err);
    res.status(500).json({ ok: false, error: "Internal Server Error" });
  });
}

startServer();

export default app;
