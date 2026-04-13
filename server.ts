import express from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
  "apiKey": "AIzaSyARd4fFDkeErs-lT71HRlLCWkdvN3RkRQg",
  "authDomain": "ads-mr-bob-report.firebaseapp.com",
  "projectId": "ads-mr-bob-report",
  "storageBucket": "ads-mr-bob-report.firebasestorage.app",
  "messagingSenderId": "67027368740",
  "appId": "1:67027368740:web:c695dc7bbf3ae1e8c0d1b1",
  "measurementId": "G-70D51TPZ85"
};

let db: any;
let auth: any;
let isInitialized = false;
let initPromise: Promise<void> | null = null;
let authError: string | null = null;

const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel ? path.join("/tmp", "data") : path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const CAMPAIGNS_FILE = path.join(DATA_DIR, "campaigns.json");

// In-memory cache (synced with Firestore)
let memoryUsers: any[] = [];
let memoryData: any = {};

async function initFirebase() {
  try {
    console.log("Initializing Firebase with inlined config...");
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);

    console.log("Firebase initialized successfully.");

    // Sign in server to allow Firestore writes
    const adminEmail = "lkbimrbob@gmail.com";
    const adminPass = "kayaraya123";

    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPass);
      console.log("Server signed in to Firebase successfully.");
      authError = null;
    } catch (err: any) {
      authError = err.message;
      console.error("CRITICAL: Server failed to sign in to Firebase. Firestore operations will likely fail.", err);
      console.error("Reason:", err.message);
      if (err.code === 'auth/operation-not-allowed') {
        console.error("ACTION REQUIRED: Enable Email/Password Authentication in the Firebase Console.");
      }
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

    // 3. Start Cron Jobs
    setupCronJobs();

    return true;
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
app.use(express.json({ limit: '10mb' }));

// Middleware to ensure initialization
app.use(async (req, res, next) => {
  try {
    if (!isInitialized) {
      await performInit();
    }
    next();
  } catch (err) {
    console.error("Initialization middleware error:", err);
    res.status(500).json({ ok: false, error: "Server initialization failed" });
  }
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
    authenticated: !!auth?.currentUser,
    authError: authError,
    userEmail: auth?.currentUser?.email,
    usersCount: memoryUsers.length,
    vercel: isVercel,
    time: new Date().toISOString()
  });
});

// --- Auth & User Management ---

app.post("/api/auth/login", async (req, res) => {
  try {
    const isAuth = await ensureAuth();
    let { email, password } = req.body;
    console.log(`Login attempt for: ${email}. Server Auth: ${auth?.currentUser?.email || 'None'}`);
    
    if (!isAuth) {
      return res.status(500).json({ 
        ok: false, 
        error: `Server Authentication Failed: ${authError}. Pastikan user 'lkbimrbob@gmail.com' sudah dibuat di Firebase Console > Authentication.` 
      });
    }
    
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Email dan password wajib diisi" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // Hardcoded fail-safe for super admin to ensure access
    if (cleanEmail === "lkbimrbob@gmail.com" && cleanPass === "kayaraya123") {
      console.log("Super Admin hardcoded login successful.");
      // Still try to find in Firestore to get full profile
      const usersSnap = await getDocs(query(collection(db, 'users'), where("email", "==", cleanEmail)));
      let admin = usersSnap.docs.length > 0 ? usersSnap.docs[0].data() : null;
      
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

    console.log(`Checking Firestore for user: ${cleanEmail}`);
    const usersSnap = await getDocs(query(collection(db, 'users'), where("email", "==", cleanEmail)));
    const user = usersSnap.docs.length > 0 ? usersSnap.docs[0].data() : null;
    
    if (user && user.pass === cleanPass) {
      console.log(`Login successful for user: ${email}`);
      const { pass, ...userWithoutPass } = user;
      res.json({ ok: true, user: userWithoutPass });
    } else {
      console.log(`Login failed for user: ${email}. User not found or password incorrect.`);
      res.status(401).json({ ok: false, error: "Email atau password salah" });
    }
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ ok: false, error: `Login server error: ${err.message || err}` });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const usersSnap = await getDocs(query(collection(db, 'users'), where("email", "==", email)));
    if (usersSnap.docs.length > 0) {
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

    // Persist to Firestore
    await setDoc(doc(db, 'users', newUser.id), newUser);
    
    const { pass, ...userWithoutPass } = newUser;
    res.json({ ok: true, user: userWithoutPass });
  } catch (err: any) {
    console.error("Register error:", err);
    res.status(500).json({ ok: false, error: `Register server error: ${err.message || err}` });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    await ensureAuth();
    const usersSnap = await getDocs(collection(db, 'users'));
    const users = usersSnap.docs.map(doc => {
      const { pass, ...u } = doc.data();
      return u;
    });
    res.json({ ok: true, users });
  } catch (err: any) {
    console.error("Get users error:", err);
    res.status(500).json({ ok: false, error: `Get users error: ${err.message || err}` });
  }
});

async function ensureAuth() {
  if (!auth?.currentUser) {
    console.log("Server not authenticated, attempting sign-in...");
    const adminEmail = "lkbimrbob@gmail.com";
    const adminPass = "kayaraya123";
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPass);
      console.log("Server signed in successfully.");
      authError = null;
      return true;
    } catch (err: any) {
      authError = err.message;
      console.error("Server failed to sign in:", err);
      return false;
    }
  }
  return true;
}

app.post("/api/users/add", async (req, res) => {
  try {
    await ensureAuth();
    const newUser = req.body;
    console.log(`Adding new user: ${newUser.email}`);
    
    if (!newUser.email) {
      return res.status(400).json({ ok: false, error: "Email wajib diisi" });
    }

    const usersSnap = await getDocs(query(collection(db, 'users'), where("email", "==", newUser.email)));
    if (usersSnap.docs.length > 0) {
      return res.status(400).json({ ok: false, error: "Email sudah terdaftar" });
    }

    // Persist to Firestore
    try {
      await setDoc(doc(db, 'users', newUser.id), newUser);
      console.log(`User ${newUser.email} added to Firestore.`);
      
      // Update memory cache
      memoryUsers.push(newUser);
      
      res.json({ ok: true });
    } catch (fsErr: any) {
      console.error("Firestore error adding user:", fsErr);
      res.status(500).json({ ok: false, error: `Firestore error: ${fsErr.message}. Pastikan Email/Password Auth sudah aktif di Firebase Console.` });
    }
  } catch (err: any) {
    console.error("Add user error:", err);
    res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
});

app.post("/api/users/update", async (req, res) => {
  try {
    await ensureAuth();
    const updatedUser = req.body;
    if (!updatedUser.id) {
      return res.status(400).json({ ok: false, error: "User ID wajib diisi" });
    }

    const userRef = doc(db, 'users', updatedUser.id);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const currentData = userSnap.data();
      const finalData = { ...currentData, ...updatedUser };
      
      // Persist to Firestore
      await setDoc(userRef, finalData);
      res.json({ ok: true });
    } else {
      res.status(404).json({ ok: false, error: "User not found" });
    }
  } catch (err: any) {
    console.error("Update user error:", err);
    res.status(500).json({ ok: false, error: `Update user error: ${err.message || err}` });
  }
});

app.post("/api/users/delete", async (req, res) => {
  try {
    await ensureAuth();
    const { id } = req.body;
    console.log(`Attempting to delete user with ID: ${id}`);
    
    if (id === "super-admin") {
      return res.status(400).json({ ok: false, error: "Super Admin tidak bisa dihapus" });
    }

    const userRef = doc(db, 'users', id);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // Delete from Firestore
      try {
        await deleteDoc(userRef);
        console.log(`User ${id} deleted from Firestore.`);
        
        // Update memory cache
        memoryUsers = memoryUsers.filter((u: any) => u.id !== id);
        
        res.json({ ok: true });
      } catch (fsErr: any) {
        console.error("Firestore error deleting user:", fsErr);
        res.status(500).json({ ok: false, error: `Firestore error: ${fsErr.message}. Pastikan Email/Password Auth sudah aktif di Firebase Console.` });
      }
    } else {
      console.log(`User with ID ${id} not found in Firestore.`);
      res.status(404).json({ ok: false, error: "User not found" });
    }
  } catch (err: any) {
    console.error("Delete user error:", err);
    res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
});

  // --- Campaign Data Management ---

  app.get("/api/data", async (req, res) => {
    try {
      res.json({ ok: true, data: memoryData });
    } catch (err: any) {
      console.error("Get data error:", err);
      res.status(500).json({ ok: false, error: `Get data error: ${err.message || err}` });
    }
  });

  app.post("/api/data", async (req, res) => {
    try {
      await ensureAuth();
      const { userId, campaigns } = req.body;
      memoryData[userId] = { campaigns };
      
      // Persist to Firestore (Individual campaigns)
      for (const c of campaigns) {
        const campaignId = String(c.id || Math.random().toString(36).substring(2, 9));
        await setDoc(doc(db, 'campaigns', campaignId), { ...c, id: campaignId });
      }

      if (!isVercel) {
        try {
          await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify(memoryData, null, 2));
        } catch (e) {}
      }
      res.json({ ok: true });
    } catch (err: any) {
      console.error("Save data error:", err);
      res.status(500).json({ ok: false, error: `Save data error: ${err.message || err}` });
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
      const { customerId, dateRange, startDate, endDate, gadsRefreshToken } = req.body;

      if (!customerId) {
        return res.status(400).json({ ok: false, error: "Customer ID is required" });
      }

      const CLIENT_ID = process.env.GADS_CLIENT_ID;
      const CLIENT_SECRET = process.env.GADS_CLIENT_SECRET;
      const DEVELOPER_TOKEN = process.env.GADS_DEVELOPER_TOKEN;
      const MCC_ID = process.env.GADS_MCC_ID;
      
      // Use user-provided refresh token or fallback to global one
      const REFRESH_TOKEN = gadsRefreshToken || process.env.GADS_REFRESH_TOKEN;

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
      const { gadsRefreshToken } = req.query;
      const CLIENT_ID = process.env.GADS_CLIENT_ID;
      const CLIENT_SECRET = process.env.GADS_CLIENT_SECRET;
      const REFRESH_TOKEN = (gadsRefreshToken as string) || process.env.GADS_REFRESH_TOKEN;

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
  
  app.post("/api/automation/run", async (req, res) => {
    try {
      const { secret } = req.body;
      if (secret !== process.env.CRON_SECRET && secret !== 'kayaraya123') {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }
      runAutomationForAllUsers();
      res.json({ ok: true, message: "Automation triggered" });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // API 404 handler - must be before SPA fallback
  app.all("/api/*", (req, res) => {
    res.status(404).json({ ok: false, error: `API route ${req.url} not found` });
  });

  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global error:", err);
  res.status(500).json({ ok: false, error: "Internal Server Error" });
});

// --- Automation Logic ---

async function setupCronJobs() {
  console.log("Setting up automation cron jobs...");
  
  // 15:30 WIB (08:30 UTC)
  cron.schedule('30 8 * * *', () => {
    console.log("Running Daily Automation (15:30 WIB)...");
    runAutomationForAllUsers();
  });
}

async function runAutomationForAllUsers() {
  try {
    await ensureAuth();
    const usersSnap = await getDocs(collection(db, 'users'));
    const users = usersSnap.docs.map(doc => doc.data());
    
    for (const user of users) {
      if (user.automationEnabled) {
        console.log(`Running automation for user: ${user.name} (${user.email})`);
        await runAutomationForUser(user);
      }
    }
  } catch (err) {
    console.error("Global automation error:", err);
  }
}

async function runAutomationForUser(user: any) {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let yesterdayCampaigns: any[] = [];
    let todayCampaigns: any[] = [];

    // 1. Fetch FB Ads
    if (user.fbToken && user.fbAdvertisers && user.fbAdvertisers.length > 0) {
      for (let accountId of user.fbAdvertisers) {
        if (!accountId.trim()) continue;
        if (!accountId.startsWith('act_')) accountId = 'act_' + accountId;
        try {
          const url = `https://graph.facebook.com/v21.0/${accountId}/insights?level=campaign&fields=campaign_name,spend,actions&access_token=${user.fbToken}&time_range={"since":"${yesterdayStr}","until":"${todayStr}"}&time_increment=1&limit=500`;
          const res = await fetch(url);
          const result = await res.json();
          
          if (result.data) {
            result.data.forEach((c: any) => {
              const spend = parseFloat(c.spend || '0');
              if (spend <= 0) return;

              const actions = c.actions || [];
              const leadAct = actions.find((a: any) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped');
              const leads = leadAct ? parseInt(leadAct.value) : 0;

              const item = {
                name: `Facebook ${c.campaign_name}`,
                spend: spend,
                leads: leads
              };
              
              if (c.date_start === yesterdayStr) {
                yesterdayCampaigns.push(item);
              } else if (c.date_start === todayStr) {
                todayCampaigns.push(item);
              }
            });
          }
        } catch (e) {
          console.error(`Automation FB Error for ${user.email}:`, e);
        }
      }
    }

    // 2. Fetch Google Ads
    if (user.gadsAdvertisers && user.gadsAdvertisers.length > 0) {
      const CLIENT_ID = process.env.GADS_CLIENT_ID;
      const CLIENT_SECRET = process.env.GADS_CLIENT_SECRET;
      const DEVELOPER_TOKEN = process.env.GADS_DEVELOPER_TOKEN;
      const REFRESH_TOKEN = user.gadsRefreshToken || process.env.GADS_REFRESH_TOKEN;

      if (CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN && DEVELOPER_TOKEN) {
        try {
          const { GoogleAdsApi } = await import("google-ads-api");
          const client = new GoogleAdsApi({
            client_id: CLIENT_ID.trim(),
            client_secret: CLIENT_SECRET.trim(),
            developer_token: DEVELOPER_TOKEN.trim(),
          });

          for (let cid of user.gadsAdvertisers) {
            if (!cid.trim()) continue;
            const cleanCid = cid.replace(/\D/g, "");
            try {
              const customer = client.Customer({
                customer_id: cleanCid,
                refresh_token: REFRESH_TOKEN.trim(),
              });

              const query = `
                SELECT segments.date, campaign.name, metrics.cost_micros, metrics.conversions
                FROM campaign 
                WHERE segments.date BETWEEN '${yesterdayStr}' AND '${todayStr}'
              `;
              const results = await customer.query(query);
              results.forEach((row: any) => {
                const spend = (row.metrics.cost_micros || 0) / 1000000;
                if (spend <= 0) return;

                const leads = Math.round(row.metrics.conversions || 0);

                const item = {
                  name: `Google ${row.campaign.name}`,
                  spend: spend,
                  leads: leads
                };
                
                if (row.segments.date === yesterdayStr) {
                  yesterdayCampaigns.push(item);
                } else if (row.segments.date === todayStr) {
                  todayCampaigns.push(item);
                }
              });
            } catch (e) {
              console.error(`Automation GAds Error for ${user.email} (CID: ${cid}):`, e);
            }
          }
        } catch (e) {
          console.error(`Automation GAds Global Error for ${user.email}:`, e);
        }
      }
    }

    if (yesterdayCampaigns.length === 0 && todayCampaigns.length === 0) return;

    // 3. Generate Message
    const fmt = (n: number) => Math.round(n).toLocaleString('id-ID');
    
    const formatList = (camps: any[]) => {
      return camps.map(c => {
        const cpr = c.leads > 0 ? c.spend / c.leads : 0;
        return `=> ${c.name} = Rp ${fmt(c.spend)} (${c.leads} Leads, CPR: Rp ${fmt(cpr)})`;
      }).join('\n');
    };

    const yesterdayList = formatList(yesterdayCampaigns);
    const todayList = formatList(todayCampaigns);

    const msg = `Advertiser Mr.BOB: Advertiser ${user.name}
Spent Iklan ${yesterdayStr}
${yesterdayList || 'Tidak ada data'}

Spent Iklan ${todayStr}
${todayList || 'Tidak ada data'}`;

    // 4. Send WhatsApp
    if (user.waToken && user.waTarget) {
      await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: { "Authorization": user.waToken },
        body: new URLSearchParams({
          target: user.waTarget,
          message: msg
        })
      });
      console.log(`Automation report sent to ${user.waTarget} for ${user.email}`);
    }
  } catch (err) {
    console.error(`Automation error for user ${user.email}:`, err);
  }
}

async function startServer() {
  await performInit();
  const PORT = 3000;

  // Only listen if not in Vercel environment (Vercel handles the server)
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
