import { useState, useEffect, useRef, Suspense, lazy } from "react";
import Sidebar from "./components/Sidebar.jsx";
import RoleLoginModal from "./components/RoleLoginModal.jsx";
import RoleVerificationModal from "./components/RoleVerificationModal.jsx";
import Footer from "./components/Footer.jsx";
import { fetchApi } from "./utils/api.js";

// Pages
import DashboardPage from "./pages/DashboardPage.jsx";
const CctvPage = lazy(() => import("./pages/CctvPage.jsx"));
const EggPage = lazy(() => import("./pages/EggPage.jsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx"));
const AccountsPage = lazy(() => import("./pages/AccountsPage.jsx"));
const SalesPage = lazy(() => import("./pages/SalesPage.jsx"));
const FinancePage = lazy(() => import("./pages/FinancePage.jsx"));
const KatalogPage = lazy(() => import("./pages/KatalogPage.jsx"));
const BreedersPage = lazy(() => import("./pages/BreedersPage.jsx"));
const ChicksPage = lazy(() => import("./pages/ChicksPage.jsx"));

// Hooks & Data
import { useMqttBridge } from "./hooks/useMqttBridge.js";
import useIncubatorThresholds from "./hooks/useIncubatorThresholds.js";
import {
  ROLES,
  ROLE_ACCESS_CODES,
  INITIAL_EGGS,
  INITIAL_PEAFOWL,
  INITIAL_SALES,
} from "./data/constants.js";

// Custom hook for localStorage (previously inline)
function useStoredState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Gagal menyimpan state ke localStorage (${key}):`, error);
    }
  }, [key, state]);

  return [state, setState];
}

export default function App() {
  // === GLOBAL STATES ===
  const [activePage, setActivePage] = useStoredState("km_page", "dashboard");
  const [role, setRole] = useStoredState("km_role", "viewer");
  const [verifiedRoles, setVerifiedRoles] = useStoredState("km_verified_roles", {});
  const [darkMode, setDarkMode] = useStoredState("km_dark_mode", false);
  const [activeVariety, setActiveVariety] = useStoredState("km_active_variety", "hijau");
  const [cctvUrl, setCctvUrl] = useStoredState("km_cctv_url", "rtsp://admin:Admin123@192.168.110.227:554/V_ENC_000");
  // === DATA STATES ===
  const [eggs, setEggsState] = useStoredState("km_eggs", INITIAL_EGGS);
  const [peafowl, setPeafowl] = useStoredState("km_peafowl", INITIAL_PEAFOWL);
  const [sales, setSalesState] = useStoredState("km_sales", INITIAL_SALES);
  const [finance, setFinanceState] = useStoredState("km_finance", []);

  // Sync wrappers for database REST API
  const setEggs = async (val) => {
    const nextState = typeof val === "function" ? val(eggs) : val;
    setEggsState(nextState);
    
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (apiBaseUrl === undefined) return;

    try {
      if (nextState.length > eggs.length) {
        const added = nextState.find(item => !eggs.some(x => x.id === item.id));
        if (added) {
          await fetchApi(`/api/eggs`, {
            method: "POST",
            body: JSON.stringify(added),
          });
        }
      } else if (nextState.length < eggs.length) {
        const deleted = eggs.find(item => !nextState.some(x => x.id === item.id));
        if (deleted) {
          await fetchApi(`/api/eggs/${deleted.id}`, {
            method: "DELETE",
          });
        }
      } else {
        const updated = nextState.find(item => {
          const old = eggs.find(x => x.id === item.id);
          return old && JSON.stringify(old) !== JSON.stringify(item);
        });
        if (updated) {
          await fetchApi(`/api/eggs/${updated.id}`, {
            method: "PUT",
            body: JSON.stringify(updated),
          });
        }
      }
    } catch (err) {
      console.error("Gagal sinkronisasi data telur ke API:", err);
    }
  };

  const setSales = async (val) => {
    const nextState = typeof val === "function" ? val(sales) : val;
    setSalesState(nextState);
    
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (apiBaseUrl === undefined) return;

    try {
      if (nextState.length > sales.length) {
        const added = nextState.find(item => !sales.some(x => x.id === item.id));
        if (added) {
          await fetchApi(`/api/sales`, {
            method: "POST",
            body: JSON.stringify(added),
          });
        }
      } else if (nextState.length < sales.length) {
        const deleted = sales.find(item => !nextState.some(x => x.id === item.id));
        if (deleted) {
          await fetchApi(`/api/sales/${deleted.id}`, {
            method: "DELETE",
          });
        }
      } else {
        const updated = nextState.find(item => {
          const old = sales.find(x => x.id === item.id);
          return old && JSON.stringify(old) !== JSON.stringify(item);
        });
        if (updated) {
          await fetchApi(`/api/sales/${updated.id}`, {
            method: "PUT",
            body: JSON.stringify(updated),
          });
        }
      }
    } catch (err) {
      console.error("Gagal sinkronisasi data penjualan ke API:", err);
    }
  };

  const setFinance = async (val) => {
    const nextState = typeof val === "function" ? val(finance) : val;
    setFinanceState(nextState);
    
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (apiBaseUrl === undefined) return;

    try {
      if (nextState.length > finance.length) {
        const added = nextState.find(item => !finance.some(x => x.id === item.id));
        if (added) {
          await fetchApi(`/api/finance`, {
            method: "POST",
            body: JSON.stringify(added),
          });
        }
      } else if (nextState.length < finance.length) {
        const deleted = finance.find(item => !nextState.some(x => x.id === item.id));
        if (deleted) {
          await fetchApi(`/api/finance/${deleted.id}`, {
            method: "DELETE",
          });
        }
      } else {
        const updated = nextState.find(item => {
          const old = finance.find(x => x.id === item.id);
          return old && JSON.stringify(old) !== JSON.stringify(item);
        });
        if (updated) {
          await fetchApi(`/api/finance/${updated.id}`, {
            method: "PUT",
            body: JSON.stringify(updated),
          });
        }
      }
    } catch (err) {
      console.error("Gagal sinkronisasi data keuangan ke API:", err);
    }
  };

  // === UI STATES ===
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [roleRequest, setRoleRequest] = useState(null);
  const [isHandleHovered, setIsHandleHovered] = useState(false);

  useEffect(() => {
    // Close sidebar on mount if mobile
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  // Validate JWT token and restore session on mount
  useEffect(() => {
    const token = (() => {
      try { return localStorage.getItem("jwt_token"); } catch { return null; }
    })();
    if (!token) return;

    fetchApi("/auth/me").then((user) => {
      if (user && user.role) {
        let mappedRole = "viewer";
        if (user.role === "pemilik" || user.role === "admin") mappedRole = "admin";
        else if (user.role === "staff" || user.role === "operator") mappedRole = "operator";
        setRole(mappedRole);
        console.log("Sesi dipulihkan:", user.email, "as", mappedRole);
      }
    }).catch(() => {
      // Token kadaluarsa atau tidak valid, hapus
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("user_info");
      setRole("viewer");
    });
  }, []);

  // Fetch initial data from API if configured
  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (apiBaseUrl === undefined) return;

    console.log("Memuat data dari API untuk inisialisasi state...");
    Promise.allSettled([
      fetchApi('/api/eggs').then(data => {
        if (Array.isArray(data)) setEggsState(data);
      }).catch(err => console.warn("Gagal memuat telur dari API:", err)),
      fetchApi('/api/breeders').then(data => {
        if (Array.isArray(data)) setPeafowl(data);
      }).catch(err => console.warn("Gagal memuat indukan:", err)),
      fetchApi('/api/sales').then(data => {
        if (Array.isArray(data)) setSalesState(data);
      }).catch(err => console.warn("Gagal memuat penjualan:", err)),
      fetchApi('/api/finance').then(data => {
        if (Array.isArray(data)) setFinanceState(data);
      }).catch(err => console.warn("Gagal memuat finance:", err)),
      fetchApi('/api/incubator/status').then(status => console.log("Status inkubator dari API:", status)).catch(err => console.warn("Gagal memuat status inkubator:", err)),
    ]);
  }, []);

  // === MQTT BRIDGE ===
  const { mqttUrl, clientId, connection, telemetry, temperatureTrend, humidityTrend, logs, publish } =
    useMqttBridge();

  // === AMBANG INKUBATOR DARI DATABASE ===
  // Satu-satunya sumber kebenaran range suhu/kelembaban untuk badge UI.
  const { thresholds, refreshThresholds } = useIncubatorThresholds();

  // === SIDE-EFFECTS ===
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  }, [darkMode]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add("sidebar-open");
    } else {
      document.body.classList.remove("sidebar-open");
    }
  }, [sidebarOpen]);

  // Sync telemetry readings to MySQL database via REST API (once every 60 seconds)
  const lastSavedTelemetryRef = useRef(0);

  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (apiBaseUrl === undefined) return;
    const currentTemp = telemetry.temperature ?? telemetry.temp;
    const currentHum = telemetry.humidity;
    if (currentTemp == null || currentHum == null) return;

    const now = Date.now();
    if (now - lastSavedTelemetryRef.current >= 60000) {
      lastSavedTelemetryRef.current = now;

      const temp = parseFloat(currentTemp);
      const hum = parseFloat(currentHum);

      // Status lampu: pakai telemetri aktual bila ada, fallback heuristik range DB.
      // (Dulu hardcoded 37.0-38.5 yang tidak ikut update database.)
      const lampFromTelemetry = (telemetry.statusLamp === "ON" || telemetry.statusLamp === "OFF")
        ? telemetry.statusLamp
        : null;
      const lampuStatus = lampFromTelemetry
        ?? (temp >= thresholds.suhu_min && temp <= thresholds.suhu_max ? "ON" : "OFF");
      const statusData = {
        suhu_sekarang: temp,
        kelembapan_sekarang: hum,
        lampu_status: lampuStatus,
        terakhir_rotasi: null
      };
      fetchApi(`/api/incubator/status`, {
        method: "POST",
        body: JSON.stringify(statusData),
      }).catch((err) => {
        console.error("Gagal menyimpan status inkubator ke database:", err);
      });
    }
  }, [telemetry, thresholds]);

  // === HANDLERS ===
  const handleRoleRequest = (requestedRole) => {
    if (requestedRole === "login") {
      setShowLoginModal(true);
    } else if (requestedRole === "viewer") {
      setRole("viewer");
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("user_info");
      setSidebarOpen(false);
    } else if (verifiedRoles[requestedRole]) {
      setRole(requestedRole);
      setSidebarOpen(false);
    } else {
      setRoleRequest(requestedRole);
    }
  };

  const handleLoginSelectRole = (selectedRole) => {
    setVerifiedRoles((prev) => ({
      ...prev,
      [selectedRole]: true,
    }));
    setRole(selectedRole);
    setShowLoginModal(false);
    setSidebarOpen(false);
  };

  const handlePageChange = (pageId) => {
    setActivePage(pageId);
    setSidebarOpen(false);
  };

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // === RENDER PAGE ===
  const renderPage = () => {
    const props = {
      role,
      setRole,
      publish,
      connection,
      telemetry,
      mqttUrl,
      clientId,
      temperatureTrend,
      humidityTrend,
      activeVariety,
      setActiveVariety,
      cctvUrl,
      setCctvUrl,
      thresholds,
      refreshThresholds,
    };
    
    let content;
    switch (activePage) {
      case "dashboard":
        content = (
          <DashboardPage
            {...props}
            mqttUrl={mqttUrl}
            clientId={clientId}
            temperatureTrend={temperatureTrend}
            humidityTrend={humidityTrend}
            activeVariety={activeVariety}
            eggs={eggs}
            logs={logs}
          />
        );
        break;
      case "kamera":
        content = <CctvPage {...props} />;
        break;
      case "telur":
        content = <EggPage {...props} />;
        break;
      case "katalog":
        content = <KatalogPage {...props} onPageChange={handlePageChange} />;
        break;
      case "indukan":
        content = <BreedersPage {...props} />;
        break;
      case "anakan":
        content = <ChicksPage {...props} />;
        break;
      case "pengaturan":
        content = (
          <SettingsPage
            {...props}
            activeVariety={activeVariety}
            setActiveVariety={setActiveVariety}
          />
        );
        break;
      case "penjualan":
        content = <SalesPage {...props} sales={sales} setSales={setSales} />;
        break;
      case "finance":
        content = <FinancePage {...props} finance={finance} setFinance={setFinance} />;
        break;
      case "akun":
        content = <AccountsPage {...props} />;
        break;
      default:
        content = <DashboardPage {...props} />;
        break;
    }

    return (
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-ink-secondary">
              <span className="material-symbols-outlined animate-spin text-4xl">autorenew</span>
              <p className="font-medium animate-pulse">Memuat halaman...</p>
            </div>
          </div>
        }
      >
        {content}
      </Suspense>
    );
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Mobile Topbar */}
      <div
        className="flex h-16 items-center justify-between border-b px-4 lg:hidden sticky top-0 z-50 shadow-sm transition-colors duration-500"
        style={{ borderColor: "var(--alpine-high)", backgroundColor: "var(--surface)", color: "var(--ink-primary)" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-white shadow-sm border border-alpine-high">
            <img src="/logo.png" alt="Logo" className="h-full w-full object-cover" />
          </div>
          <span className="font-display font-extrabold text-ink-primary">Kampung Merak</span>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-alpine-high bg-alpine-low text-ink-secondary"
          aria-label="Buka Menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>

      <Sidebar
        connection={connection}
        activePage={activePage}
        onPageChange={handlePageChange}
        role={role}
        onRoleRequest={handleRoleRequest}
        verifiedRoles={verifiedRoles}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />

      {/* Desktop vertical middle toggle handle */}
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        onMouseEnter={() => setIsHandleHovered(true)}
        onMouseLeave={() => setIsHandleHovered(false)}
        className="fixed top-1/2 -translate-y-1/2 z-[80] hidden lg:flex h-8 w-8 items-center justify-center rounded-full border border-alpine-high bg-surface shadow-md hover:bg-alpine-low text-ink-primary transition-all active:scale-95 cursor-pointer"
        style={{
          left: sidebarOpen ? "264px" : (isHandleHovered ? "0px" : "-16px"),
          transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.1s, background-color 0.2s, color 0.2s",
        }}
        title={sidebarOpen ? "Sembunyikan Sidebar" : "Tampilkan Sidebar"}
      >
        <span className="material-symbols-outlined text-[20px]">
          {sidebarOpen ? "chevron_left" : "chevron_right"}
        </span>
      </button>

      {/* Overlay for mobile sidebar */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <main
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:ml-[280px]" : "lg:ml-0"}`}
        style={{ backgroundColor: "var(--alpine-mist)", color: "var(--ink-primary)" }}
      >
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 flex-1 w-full">
          {renderPage()}
        </div>
        <Footer onPageChange={handlePageChange} connection={connection} />
      </main>

      {showLoginModal && (
        <RoleLoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={(newRole) => {
            // Map remote backend roles to local UI roles
            let mappedRole = "viewer";
            if (newRole === "pemilik" || newRole === "admin") mappedRole = "admin";
            else if (newRole === "staff" || newRole === "operator") mappedRole = "operator";

            setRole(mappedRole);
            setSidebarOpen(false);

            // Reload protected data setelah login
            fetchApi('/api/finance')
              .then(data => setFinanceState(data))
              .catch(err => console.warn("Gagal reload finance setelah login:", err));
            fetchApi('/api/sales')
              .then(data => setSalesState(data))
              .catch(err => console.warn("Gagal reload sales setelah login:", err));
          }}
        />
      )}

      {roleRequest && (
        <RoleVerificationModal
          role={roleRequest}
          expectedCode={ROLE_ACCESS_CODES[roleRequest]}
          onSuccess={() => {
            setVerifiedRoles((prev) => ({ ...prev, [roleRequest]: true }));
            setRole(roleRequest);
            setRoleRequest(null);
            setSidebarOpen(false);
          }}
          onCancel={() => setRoleRequest(null)}
        />
      )}
    </div>
  );
}