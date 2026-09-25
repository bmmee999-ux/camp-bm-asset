"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type {
  AssetInsert,
  AssetRow,
  FileInsert,
  FileRow,
  LocationInsert,
  LocationRow,
  TransactionInsert,
  TransactionRow,
  TransactionType,
} from "@/lib/supabase/types";

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  message?: string;
};

type TabKey = "dashboard" | "add" | "assets" | "search" | "more";
type Language = "en" | "th" | "lo";

const transactionTypeOptions: TransactionType[] = [
  "BORROW",
  "RETURN",
  "REPAIR_SEND",
  "REPAIR_RECEIVE",
  "MOVE",
];

const messages: Record<Language, Record<string, string>> = {
  en: {
    appTitle: "Asset Management System",
    workspace: "Mobile-first workspace",
    dashboard: "Dashboard",
    addTransaction: "Add Transaction",
    assets: "Assets",
    search: "Search",
    more: "More",
    overview: "Overview",
    recentTransactions: "Recent Transactions",
    loading: "Loading...",
    noEmployee: "No employee",
    assetNo: "Asset No",
    selectAsset: "Select Asset",
    transactionType: "Transaction Type",
    cklNo: "CKL No",
    employeeName: "Employee Name",
    employeeId: "Employee ID",
    remark: "Remark",
    saveTransaction: "Save Transaction",
    addAsset: "Add Asset",
    assetName: "Asset Name",
    sapNo: "SAP No",
    currentStatus: "Current Status",
    currentLocation: "Current Location",
    saveAsset: "Save Asset",
    assetList: "Asset List",
    searchPlaceholder: "Search asset no, name, employee, CKL...",
    matchedAssets: "Matched Assets",
    matchedTransactions: "Matched Transactions",
    switchToLight: "Switch to Light Mode",
    switchToDark: "Switch to Dark Mode",
    refreshData: "Refresh Data",
    attachFile: "Attach File to Transaction",
    selectTransaction: "Select Transaction",
    fileUrl: "File URL",
    fileType: "File Type",
    saveFileRecord: "Save File Record",
    recordMove: "Record Asset Move",
    oldLocation: "Old Location",
    newLocation: "New Location",
    latitude: "Latitude",
    longitude: "Longitude",
    saveLocationMove: "Save Location Move",
    language: "Language",
    english: "English",
    thai: "ไทย",
    lao: "ລາວ",
    transactions: "Transactions",
    files: "Files",
    locations: "Locations",
    repairCount: "Repair Count",
    createdAsset: "Asset created successfully",
    createdTransaction: "Transaction created successfully",
    createdFile: "File record created successfully",
    createdLocation: "Location move created successfully",
    failedLoad: "Failed loading data",
    failedAsset: "Failed to create asset",
    failedTransaction: "Failed to create transaction",
    failedFile: "Failed to create file record",
    failedLocation: "Failed to create location record",
  },
  th: {
    appTitle: "ระบบจัดการทรัพย์สิน",
    workspace: "พื้นที่ทำงานแบบมือถือก่อน",
    dashboard: "แดชบอร์ด",
    addTransaction: "เพิ่มรายการ",
    assets: "ทรัพย์สิน",
    search: "ค้นหา",
    more: "เพิ่มเติม",
    overview: "ภาพรวม",
    recentTransactions: "รายการล่าสุด",
    loading: "กำลังโหลด...",
    noEmployee: "ไม่มีข้อมูลพนักงาน",
    assetNo: "รหัสทรัพย์สิน",
    selectAsset: "เลือกทรัพย์สิน",
    transactionType: "ประเภทรายการ",
    cklNo: "เลข CKL",
    employeeName: "ชื่อพนักงาน",
    employeeId: "รหัสพนักงาน",
    remark: "หมายเหตุ",
    saveTransaction: "บันทึกรายการ",
    addAsset: "เพิ่มทรัพย์สิน",
    assetName: "ชื่อทรัพย์สิน",
    sapNo: "เลข SAP",
    currentStatus: "สถานะปัจจุบัน",
    currentLocation: "ตำแหน่งปัจจุบัน",
    saveAsset: "บันทึกทรัพย์สิน",
    assetList: "รายการทรัพย์สิน",
    searchPlaceholder: "ค้นหาเลขทรัพย์สิน ชื่อพนักงาน CKL...",
    matchedAssets: "ทรัพย์สินที่พบ",
    matchedTransactions: "รายการที่พบ",
    switchToLight: "เปลี่ยนเป็นโหมดสว่าง",
    switchToDark: "เปลี่ยนเป็นโหมดมืด",
    refreshData: "รีเฟรชข้อมูล",
    attachFile: "แนบไฟล์กับรายการ",
    selectTransaction: "เลือกรายการ",
    fileUrl: "ลิงก์ไฟล์",
    fileType: "ประเภทไฟล์",
    saveFileRecord: "บันทึกไฟล์",
    recordMove: "บันทึกการย้ายตำแหน่ง",
    oldLocation: "ตำแหน่งเดิม",
    newLocation: "ตำแหน่งใหม่",
    latitude: "ละติจูด",
    longitude: "ลองจิจูด",
    saveLocationMove: "บันทึกการย้าย",
    language: "ภาษา",
    english: "English",
    thai: "ไทย",
    lao: "ລາວ",
    transactions: "ธุรกรรม",
    files: "ไฟล์",
    locations: "ตำแหน่ง",
    repairCount: "จำนวนซ่อม",
    createdAsset: "เพิ่มทรัพย์สินสำเร็จ",
    createdTransaction: "เพิ่มรายการสำเร็จ",
    createdFile: "บันทึกไฟล์สำเร็จ",
    createdLocation: "บันทึกการย้ายสำเร็จ",
    failedLoad: "โหลดข้อมูลไม่สำเร็จ",
    failedAsset: "เพิ่มทรัพย์สินไม่สำเร็จ",
    failedTransaction: "เพิ่มรายการไม่สำเร็จ",
    failedFile: "บันทึกไฟล์ไม่สำเร็จ",
    failedLocation: "บันทึกการย้ายไม่สำเร็จ",
  },
  lo: {
    appTitle: "ລະບົບຈັດການຊັບສິນ",
    workspace: "ໜ້າງານແບບມືຖື",
    dashboard: "ໜ້າຫຼັກ",
    addTransaction: "ເພີ່ມລາຍການ",
    assets: "ຊັບສິນ",
    search: "ຄົ້ນຫາ",
    more: "ເພີ່ມເຕີມ",
    overview: "ພາບລວມ",
    recentTransactions: "ທຸລະກຳຫຼ້າສຸດ",
    loading: "ກຳລັງໂຫຼດ...",
    noEmployee: "ບໍ່ມີຂໍ້ມູນພະນັກງານ",
    assetNo: "ເລກຊັບສິນ",
    selectAsset: "ເລືອກຊັບສິນ",
    transactionType: "ປະເພດທຸລະກຳ",
    cklNo: "ເລກ CKL",
    employeeName: "ຊື່ພະນັກງານ",
    employeeId: "ລະຫັດພະນັກງານ",
    remark: "ໝາຍເຫດ",
    saveTransaction: "ບັນທຶກທຸລະກຳ",
    addAsset: "ເພີ່ມຊັບສິນ",
    assetName: "ຊື່ຊັບສິນ",
    sapNo: "ເລກ SAP",
    currentStatus: "ສະຖານະປັດຈຸບັນ",
    currentLocation: "ສະຖານທີ່ປັດຈຸບັນ",
    saveAsset: "ບັນທຶກຊັບສິນ",
    assetList: "ລາຍການຊັບສິນ",
    searchPlaceholder: "ຄົ້ນຫາເລກຊັບສິນ, ພະນັກງານ, CKL...",
    matchedAssets: "ຊັບສິນທີ່ພົບ",
    matchedTransactions: "ທຸລະກຳທີ່ພົບ",
    switchToLight: "ປ່ຽນເປັນໂໝດສະຫວ່າງ",
    switchToDark: "ປ່ຽນເປັນໂໝດມືດ",
    refreshData: "ໂຫຼດຂໍ້ມູນໃໝ່",
    attachFile: "ແນບໄຟລ໌ກັບທຸລະກຳ",
    selectTransaction: "ເລືອກທຸລະກຳ",
    fileUrl: "ລິ້ງໄຟລ໌",
    fileType: "ປະເພດໄຟລ໌",
    saveFileRecord: "ບັນທຶກໄຟລ໌",
    recordMove: "ບັນທຶກການຍ້າຍ",
    oldLocation: "ສະຖານທີ່ເກົ່າ",
    newLocation: "ສະຖານທີ່ໃໝ່",
    latitude: "Latitude",
    longitude: "Longitude",
    saveLocationMove: "ບັນທຶກການຍ້າຍ",
    language: "ພາສາ",
    english: "English",
    thai: "ไทย",
    lao: "ລາວ",
    transactions: "ທຸລະກຳ",
    files: "ໄຟລ໌",
    locations: "ສະຖານທີ່",
    repairCount: "ຈຳນວນສ້ອມ",
    createdAsset: "ເພີ່ມຊັບສິນສຳເລັດ",
    createdTransaction: "ເພີ່ມທຸລະກຳສຳເລັດ",
    createdFile: "ບັນທຶກໄຟລ໌ສຳເລັດ",
    createdLocation: "ບັນທຶກການຍ້າຍສຳເລັດ",
    failedLoad: "ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ",
    failedAsset: "ເພີ່ມຊັບສິນບໍ່ສຳເລັດ",
    failedTransaction: "ເພີ່ມທຸລະກຳບໍ່ສຳເລັດ",
    failedFile: "ບັນທຶກໄຟລ໌ບໍ່ສຳເລັດ",
    failedLocation: "ບັນທຶກການຍ້າຍບໍ່ສຳເລັດ",
  },
};

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !body.ok) {
    throw new Error(body.message ?? "Request failed");
  }

  return body.data as T;
}

function detectInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem("ams-lang");
  if (saved === "en" || saved === "th" || saved === "lo") return saved;

  const browser = navigator.language.toLowerCase();
  if (browser.startsWith("th")) return "th";
  if (browser.startsWith("lo")) return "lo";
  return "en";
}

export function AssetManagementSystem() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [lang, setLang] = useState<Language>("en");
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const [isDark, setIsDark] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [assetForm, setAssetForm] = useState<AssetInsert>({
    asset_no: "",
    asset_name: "",
    sap_no: "",
    current_status: "AVAILABLE",
    current_location: "HQ",
    repair_count: 0,
  });

  const [transactionForm, setTransactionForm] = useState<TransactionInsert>({
    asset_no: "",
    transaction_type: "BORROW",
    ckl_no: "",
    employee_name: "",
    employee_id: "",
    remark: "",
  });

  const [fileForm, setFileForm] = useState<FileInsert>({
    transaction_id: "",
    file_url: "",
    file_type: "image/jpeg",
  });

  const [locationForm, setLocationForm] = useState<LocationInsert>({
    asset_no: "",
    old_location: "",
    new_location: "",
    latitude: null,
    longitude: null,
  });

  useEffect(() => {
    setLang(detectInitialLanguage());

    const savedTheme = localStorage.getItem("ams-theme");
    const fromSystem = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = savedTheme ? savedTheme === "dark" : fromSystem;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  useEffect(() => {
    localStorage.setItem("ams-lang", lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("ams-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const t = (key: string) => messages[lang][key] ?? messages.en[key] ?? key;

  const tabs = useMemo(
    () => [
      { key: "dashboard" as TabKey, label: t("dashboard"), icon: "🏠" },
      { key: "add" as TabKey, label: t("addTransaction"), icon: "➕" },
      { key: "assets" as TabKey, label: t("assets"), icon: "📦" },
      { key: "search" as TabKey, label: t("search"), icon: "🔍" },
      { key: "more" as TabKey, label: t("more"), icon: "⚙️" },
    ],
    [lang],
  );

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [assetData, transactionData, fileData, locationData] = await Promise.all([
        fetchJson<AssetRow[]>("/api/assets"),
        fetchJson<TransactionRow[]>("/api/transactions"),
        fetchJson<FileRow[]>("/api/files"),
        fetchJson<LocationRow[]>("/api/locations"),
      ]);

      setAssets(assetData);
      setTransactions(transactionData);
      setFiles(fileData);
      setLocations(locationData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedLoad"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assetNumbers = useMemo(() => assets.map((a) => a.asset_no), [assets]);
  const totalRepairCount = useMemo(
    () => assets.reduce((sum, asset) => sum + (asset.repair_count ?? 0), 0),
    [assets],
  );

  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return { assets: [], transactions: [] };
    }

    return {
      assets: assets.filter(
        (a) =>
          a.asset_no.toLowerCase().includes(term) ||
          a.asset_name.toLowerCase().includes(term) ||
          (a.sap_no ?? "").toLowerCase().includes(term) ||
          a.current_location.toLowerCase().includes(term),
      ),
      transactions: transactions.filter(
        (tr) =>
          tr.asset_no.toLowerCase().includes(term) ||
          tr.transaction_type.toLowerCase().includes(term) ||
          (tr.employee_name ?? "").toLowerCase().includes(term) ||
          (tr.employee_id ?? "").toLowerCase().includes(term) ||
          (tr.ckl_no ?? "").toLowerCase().includes(term),
      ),
    };
  }, [assets, transactions, searchTerm]);

  async function onCreateAsset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitMessage(null);

    try {
      await fetchJson<AssetRow>("/api/assets", {
        method: "POST",
        body: JSON.stringify(assetForm),
      });
      setSubmitMessage(t("createdAsset"));
      setAssetForm({
        asset_no: "",
        asset_name: "",
        sap_no: "",
        current_status: "AVAILABLE",
        current_location: "HQ",
        repair_count: 0,
      });
      await loadAll();
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : t("failedAsset"));
    }
  }

  async function onCreateTransaction(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitMessage(null);

    try {
      await fetchJson<TransactionRow>("/api/transactions", {
        method: "POST",
        body: JSON.stringify(transactionForm),
      });
      setSubmitMessage(t("createdTransaction"));
      setTransactionForm({
        asset_no: "",
        transaction_type: "BORROW",
        ckl_no: "",
        employee_name: "",
        employee_id: "",
        remark: "",
      });
      await loadAll();
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : t("failedTransaction"));
    }
  }

  async function onCreateFile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitMessage(null);

    try {
      await fetchJson<FileRow>("/api/files", {
        method: "POST",
        body: JSON.stringify(fileForm),
      });
      setSubmitMessage(t("createdFile"));
      setFileForm({ transaction_id: "", file_url: "", file_type: "image/jpeg" });
      await loadAll();
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : t("failedFile"));
    }
  }

  async function onCreateLocation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitMessage(null);

    try {
      await fetchJson<LocationRow>("/api/locations", {
        method: "POST",
        body: JSON.stringify(locationForm),
      });
      setSubmitMessage(t("createdLocation"));
      setLocationForm({ asset_no: "", old_location: "", new_location: "", latitude: null, longitude: null });
      await loadAll();
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : t("failedLocation"));
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-screen-sm overflow-x-hidden bg-slate-100 pb-24 pb-safe text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{t("appTitle")}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("workspace")}</p>
          </div>
          <select
            aria-label={t("language")}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
            value={lang}
            onChange={(e) => setLang(e.target.value as Language)}
          >
            <option value="en">EN</option>
            <option value="th">TH</option>
            <option value="lo">LO</option>
          </select>
        </div>
      </header>

      <section className="space-y-4 px-4 py-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {submitMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            {submitMessage}
          </div>
        )}

        {activeTab === "dashboard" && (
          <div className="space-y-4">
            <Card>
              <h2 className="text-sm font-semibold">{t("overview")}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Metric label={t("assets")} value={assets.length} />
                <Metric label={t("transactions")} value={transactions.length} />
                <Metric label={t("files")} value={files.length} />
                <Metric label={t("locations")} value={locations.length} />
                <Metric label={t("repairCount")} value={totalRepairCount} />
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold">{t("recentTransactions")}</h3>
              {loading ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("loading")}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {transactions.slice(0, 8).map((item) => (
                    <li key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                      <p className="font-medium">{item.transaction_type}</p>
                      <p className="text-slate-600 dark:text-slate-300">{item.asset_no}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {item.employee_name ?? t("noEmployee")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}

        {activeTab === "add" && (
          <Card>
            <h2 className="text-sm font-semibold">➕ {t("addTransaction")}</h2>
            <form onSubmit={onCreateTransaction} className="mt-3 space-y-3">
              <FieldLabel text={t("assetNo")} />
              <select
                className="input"
                value={transactionForm.asset_no}
                onChange={(e) => setTransactionForm((v) => ({ ...v, asset_no: e.target.value }))}
                required
              >
                <option value="">{t("selectAsset")}</option>
                {assetNumbers.map((assetNo) => (
                  <option key={assetNo} value={assetNo}>
                    {assetNo}
                  </option>
                ))}
              </select>

              <FieldLabel text={t("transactionType")} />
              <select
                className="input"
                value={transactionForm.transaction_type}
                onChange={(e) =>
                  setTransactionForm((v) => ({ ...v, transaction_type: e.target.value as TransactionType }))
                }
              >
                {transactionTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <FieldLabel text={t("cklNo")} />
              <input
                className="input"
                placeholder={t("cklNo")}
                value={transactionForm.ckl_no ?? ""}
                onChange={(e) => setTransactionForm((v) => ({ ...v, ckl_no: e.target.value }))}
              />

              <FieldLabel text={t("employeeName")} />
              <input
                className="input"
                placeholder={t("employeeName")}
                value={transactionForm.employee_name ?? ""}
                onChange={(e) => setTransactionForm((v) => ({ ...v, employee_name: e.target.value }))}
              />

              <FieldLabel text={t("employeeId")} />
              <input
                className="input"
                placeholder={t("employeeId")}
                value={transactionForm.employee_id ?? ""}
                onChange={(e) => setTransactionForm((v) => ({ ...v, employee_id: e.target.value }))}
              />

              <FieldLabel text={t("remark")} />
              <textarea
                className="input min-h-20"
                placeholder={t("remark")}
                value={transactionForm.remark ?? ""}
                onChange={(e) => setTransactionForm((v) => ({ ...v, remark: e.target.value }))}
              />

              <button className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                {t("saveTransaction")}
              </button>
            </form>
          </Card>
        )}

        {activeTab === "assets" && (
          <div className="space-y-4">
            <Card>
              <h2 className="text-sm font-semibold">📦 {t("addAsset")}</h2>
              <form onSubmit={onCreateAsset} className="mt-3 space-y-3">
                <FieldLabel text={t("assetNo")} />
                <input
                  className="input"
                  placeholder={t("assetNo")}
                  value={assetForm.asset_no}
                  onChange={(e) => setAssetForm((v) => ({ ...v, asset_no: e.target.value }))}
                  required
                />

                <FieldLabel text={t("assetName")} />
                <input
                  className="input"
                  placeholder={t("assetName")}
                  value={assetForm.asset_name}
                  onChange={(e) => setAssetForm((v) => ({ ...v, asset_name: e.target.value }))}
                  required
                />

                <FieldLabel text={t("sapNo")} />
                <input
                  className="input"
                  placeholder={t("sapNo")}
                  value={assetForm.sap_no ?? ""}
                  onChange={(e) => setAssetForm((v) => ({ ...v, sap_no: e.target.value }))}
                />

                <FieldLabel text={t("currentStatus")} />
                <input
                  className="input"
                  placeholder="AVAILABLE"
                  value={assetForm.current_status ?? ""}
                  onChange={(e) => setAssetForm((v) => ({ ...v, current_status: e.target.value }))}
                />

                <FieldLabel text={t("currentLocation")} />
                <input
                  className="input"
                  placeholder="HQ"
                  value={assetForm.current_location ?? ""}
                  onChange={(e) => setAssetForm((v) => ({ ...v, current_location: e.target.value }))}
                />

                <button className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                  {t("saveAsset")}
                </button>
              </form>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold">
                {t("assetList")} ({assets.length})
              </h3>
              {loading ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("loading")}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {assets.map((asset) => (
                    <li key={asset.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                      <p className="font-medium">{asset.asset_no}</p>
                      <p className="break-words text-slate-600 dark:text-slate-300">{asset.asset_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {asset.current_status} • {asset.current_location}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}

        {activeTab === "search" && (
          <div className="space-y-4">
            <Card>
              <h2 className="text-sm font-semibold">🔍 {t("search")}</h2>
              <input
                className="input mt-3"
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Card>

            <Card>
              <h3 className="text-sm font-semibold">
                {t("matchedAssets")} ({searchResults.assets.length})
              </h3>
              <ul className="mt-3 space-y-2">
                {searchResults.assets.map((asset) => (
                  <li key={asset.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                    <p className="font-medium">{asset.asset_no}</p>
                    <p className="break-words text-slate-600 dark:text-slate-300">{asset.asset_name}</p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold">
                {t("matchedTransactions")} ({searchResults.transactions.length})
              </h3>
              <ul className="mt-3 space-y-2">
                {searchResults.transactions.map((item) => (
                  <li key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                    <p className="font-medium">{item.transaction_type}</p>
                    <p className="text-slate-600 dark:text-slate-300">{item.asset_no}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.employee_name ?? "-"}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {activeTab === "more" && (
          <div className="space-y-4">
            <Card>
              <h2 className="text-sm font-semibold">⚙️ {t("more")}</h2>

              <FieldLabel text={t("language")} />
              <div className="mt-2 grid grid-cols-3 gap-2">
                <LanguageButton current={lang} value="en" label={t("english")} onClick={setLang} />
                <LanguageButton current={lang} value="th" label={t("thai")} onClick={setLang} />
                <LanguageButton current={lang} value="lo" label={t("lao")} onClick={setLang} />
              </div>

              <button
                onClick={() => setIsDark((v) => !v)}
                className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-left text-sm dark:border-slate-700"
              >
                {isDark ? t("switchToLight") : t("switchToDark")}
              </button>
              <button
                onClick={() => void loadAll()}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-left text-sm dark:border-slate-700"
              >
                {t("refreshData")}
              </button>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold">{t("attachFile")}</h3>
              <form onSubmit={onCreateFile} className="mt-3 space-y-3">
                <select
                  className="input"
                  value={fileForm.transaction_id}
                  onChange={(e) => setFileForm((v) => ({ ...v, transaction_id: e.target.value }))}
                  required
                >
                  <option value="">{t("selectTransaction")}</option>
                  {transactions.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.asset_no} - {tr.transaction_type}
                    </option>
                  ))}
                </select>

                <input
                  className="input"
                  type="url"
                  placeholder={t("fileUrl")}
                  value={fileForm.file_url}
                  onChange={(e) => setFileForm((v) => ({ ...v, file_url: e.target.value }))}
                  required
                />

                <input
                  className="input"
                  placeholder={t("fileType")}
                  value={fileForm.file_type}
                  onChange={(e) => setFileForm((v) => ({ ...v, file_type: e.target.value }))}
                  required
                />

                <button className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                  {t("saveFileRecord")}
                </button>
              </form>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold">{t("recordMove")}</h3>
              <form onSubmit={onCreateLocation} className="mt-3 space-y-3">
                <select
                  className="input"
                  value={locationForm.asset_no}
                  onChange={(e) => setLocationForm((v) => ({ ...v, asset_no: e.target.value }))}
                  required
                >
                  <option value="">{t("selectAsset")}</option>
                  {assetNumbers.map((assetNo) => (
                    <option key={assetNo} value={assetNo}>
                      {assetNo}
                    </option>
                  ))}
                </select>

                <input
                  className="input"
                  placeholder={t("oldLocation")}
                  value={locationForm.old_location ?? ""}
                  onChange={(e) => setLocationForm((v) => ({ ...v, old_location: e.target.value }))}
                />

                <input
                  className="input"
                  placeholder={t("newLocation")}
                  value={locationForm.new_location}
                  onChange={(e) => setLocationForm((v) => ({ ...v, new_location: e.target.value }))}
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="input"
                    type="number"
                    step="any"
                    placeholder={t("latitude")}
                    value={locationForm.latitude ?? ""}
                    onChange={(e) =>
                      setLocationForm((v) => ({ ...v, latitude: e.target.value ? Number(e.target.value) : null }))
                    }
                  />
                  <input
                    className="input"
                    type="number"
                    step="any"
                    placeholder={t("longitude")}
                    value={locationForm.longitude ?? ""}
                    onChange={(e) =>
                      setLocationForm((v) => ({ ...v, longitude: e.target.value ? Number(e.target.value) : null }))
                    }
                  />
                </div>

                <button className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                  {t("saveLocationMove")}
                </button>
              </form>
            </Card>
          </div>
        )}
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <ul className="mx-auto grid w-full max-w-screen-sm grid-cols-5">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <li key={tab.key}>
                <button
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex w-full flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] ${
                    active
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <span className="text-base leading-none">{tab.icon}</span>
                  <span className="truncate">{tab.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </main>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">{text}</label>;
}

function LanguageButton({
  current,
  value,
  label,
  onClick,
}: {
  current: Language;
  value: Language;
  label: string;
  onClick: (value: Language) => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-lg border px-2 py-2 text-xs ${
        active
          ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-300"
          : "border-slate-300 dark:border-slate-700"
      }`}
    >
      {label}
    </button>
  );
}
