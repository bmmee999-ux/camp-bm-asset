"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { FileRow, TransactionRow, TransactionType } from "@/lib/supabase/types";

type CreateTransactionBody = {
  transaction_type: TransactionType;
  ckl_no: string;
  asset_no: string;
  asset_name: string;
  sap_no: string;
  employee_name: string;
  employee_id: string;
  transaction_date: string;
  remark: string;
};

type ApiResponse<T = unknown> = {
  ok: boolean;
  message?: string;
  data?: T;
};

const transactionOptions: Array<{ label: string; value: TransactionType }> = [
  { label: "Borrow", value: "BORROW" },
  { label: "Return", value: "RETURN" },
  { label: "Repair Send", value: "REPAIR_SEND" },
  { label: "Repair Receive", value: "REPAIR_RECEIVE" },
  { label: "Move", value: "MOVE" },
];

const MAX_FILE_SIZE_MB = 20;
const MAX_PHOTO_COUNT = 10;

function toIsoLocalDate(dateString: string) {
  if (!dateString) return new Date().toISOString();
  return new Date(`${dateString}T00:00:00`).toISOString();
}

function isAllowedPdf(file: File) {
  const lower = file.name.toLowerCase();
  return file.type === "application/pdf" || lower.endsWith(".pdf");
}

function isAllowedPhoto(file: File) {
  const lower = file.name.toLowerCase();
  return (
    file.type === "image/jpeg" ||
    file.type === "image/jpg" ||
    file.type === "image/png" ||
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".heic") ||
    lower.endsWith(".heif")
  );
}

function isUnderMaxSize(file: File) {
  return file.size <= MAX_FILE_SIZE_MB * 1024 * 1024;
}

export function AddTransactionPage() {
  const [form, setForm] = useState<CreateTransactionBody>({
    transaction_type: "BORROW",
    ckl_no: "",
    asset_no: "",
    asset_name: "",
    sap_no: "",
    employee_name: "",
    employee_id: "",
    transaction_date: new Date().toISOString().slice(0, 10),
    remark: "",
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState("");

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<FileRow[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  const canSubmit = useMemo(
    () => Boolean(form.asset_no.trim()) && Boolean(form.transaction_type),
    [form.asset_no, form.transaction_type],
  );

  const photoPreviewUrls = useMemo(() => photoFiles.map((file) => URL.createObjectURL(file)), [photoFiles]);

  useEffect(() => {
    return () => {
      photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoPreviewUrls]);

  async function loadTransactions() {
    const response = await fetch("/api/transactions", { cache: "no-store" });
    const body = (await response.json()) as ApiResponse<TransactionRow[]>;

    if (!response.ok || !body.ok) {
      throw new Error(body.message ?? "Unable to load transactions");
    }

    setTransactions(body.data ?? []);
  }

  async function loadUploadedFiles(transactionId: string) {
    if (!transactionId) {
      setUploadedFiles([]);
      return;
    }

    const response = await fetch(`/api/evidence?transactionId=${encodeURIComponent(transactionId)}`, {
      cache: "no-store",
    });
    const body = (await response.json()) as ApiResponse<FileRow[]>;

    if (!response.ok || !body.ok) {
      throw new Error(body.message ?? "Unable to load uploaded files");
    }

    setUploadedFiles(body.data ?? []);
  }

  useEffect(() => {
    void loadTransactions().catch((err) => {
      setError(err instanceof Error ? err.message : "Unable to load transactions");
    });
  }, []);

  useEffect(() => {
    void loadUploadedFiles(selectedTransactionId).catch((err) => {
      setUploadError(err instanceof Error ? err.message : "Unable to load uploaded files");
    });
  }, [selectedTransactionId]);

  function onPdfChange(file: File | null) {
    setUploadError(null);

    if (!file) {
      setPdfFile(null);
      return;
    }

    if (!isAllowedPdf(file)) {
      setUploadError("PDF evidence must be a .pdf file");
      setPdfFile(null);
      return;
    }

    if (!isUnderMaxSize(file)) {
      setUploadError(`PDF file must be <= ${MAX_FILE_SIZE_MB}MB`);
      setPdfFile(null);
      return;
    }

    setPdfFile(file);
  }

  function onPhotosChange(files: File[]) {
    setUploadError(null);

    if (files.length > MAX_PHOTO_COUNT) {
      setUploadError(`Maximum ${MAX_PHOTO_COUNT} photos per upload`);
      return;
    }

    const invalid = files.find((file) => !isAllowedPhoto(file));
    if (invalid) {
      setUploadError(`Invalid photo type: ${invalid.name}`);
      return;
    }

    const oversized = files.find((file) => !isUnderMaxSize(file));
    if (oversized) {
      setUploadError(`${oversized.name} exceeds ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    setPhotoFiles(files);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!form.asset_no.trim()) {
      setError("Asset No is required");
      return;
    }

    if (!form.transaction_type) {
      setError("Transaction Type is required");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/transactions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          asset_no: form.asset_no.trim(),
          asset_name: form.asset_name.trim(),
          sap_no: form.sap_no.trim(),
          employee_name: form.employee_name.trim(),
          employee_id: form.employee_id.trim(),
          ckl_no: form.ckl_no.trim(),
          remark: form.remark.trim(),
          transaction_date: toIsoLocalDate(form.transaction_date),
        }),
      });

      const body = (await response.json()) as ApiResponse<TransactionRow>;

      if (!response.ok || !body.ok) {
        throw new Error(body.message ?? "Unable to save transaction");
      }

      setMessage("Transaction saved successfully");

      const newTransactionId = body.data?.id ?? "";
      if (newTransactionId) {
        setSelectedTransactionId(newTransactionId);
      }

      await loadTransactions();

      setForm((prev) => ({
        ...prev,
        ckl_no: "",
        employee_name: "",
        employee_id: "",
        remark: "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save transaction");
    } finally {
      setSaving(false);
    }
  }

  async function onUploadEvidence(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);
    setUploadMessage(null);

    if (!selectedTransactionId) {
      setUploadError("Please select a transaction");
      return;
    }

    if (!pdfFile && photoFiles.length === 0) {
      setUploadError("Please select at least one PDF or photo file");
      return;
    }

    const payload = new FormData();
    payload.append("transactionId", selectedTransactionId);

    if (pdfFile) {
      payload.append("pdf", pdfFile);
    }

    photoFiles.forEach((file) => payload.append("photos", file));

    setUploading(true);

    try {
      const response = await fetch("/api/evidence", {
        method: "POST",
        body: payload,
      });

      const body = (await response.json()) as ApiResponse<FileRow[]>;
      if (!response.ok || !body.ok) {
        throw new Error(body.message ?? "Unable to upload files");
      }

      setUploadMessage("Evidence uploaded successfully");
      setPdfFile(null);
      setPhotoFiles([]);
      setFileInputKey((v) => v + 1);
      await loadUploadedFiles(selectedTransactionId);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Unable to upload files");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-screen-sm overflow-x-hidden bg-slate-100 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="space-y-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-semibold">Add Transaction</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Save transaction data to Supabase</p>

          {message && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <Label text="Transaction Type" />
            <select
              className="input"
              value={form.transaction_type}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, transaction_type: e.target.value as TransactionType }))
              }
              required
            >
              {transactionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <Label text="CKL Doc No" />
            <input
              className="input"
              value={form.ckl_no}
              onChange={(e) => setForm((prev) => ({ ...prev, ckl_no: e.target.value }))}
              placeholder="CKL Doc No"
            />

            <Label text="Asset No" />
            <input
              className="input"
              value={form.asset_no}
              onChange={(e) => setForm((prev) => ({ ...prev, asset_no: e.target.value }))}
              placeholder="Asset No"
              required
            />

            <Label text="Asset Name" />
            <input
              className="input"
              value={form.asset_name}
              onChange={(e) => setForm((prev) => ({ ...prev, asset_name: e.target.value }))}
              placeholder="Asset Name"
            />

            <Label text="SAP No" />
            <input
              className="input"
              value={form.sap_no}
              onChange={(e) => setForm((prev) => ({ ...prev, sap_no: e.target.value }))}
              placeholder="SAP No"
            />

            <Label text="Employee Name" />
            <input
              className="input"
              value={form.employee_name}
              onChange={(e) => setForm((prev) => ({ ...prev, employee_name: e.target.value }))}
              placeholder="Employee Name"
            />

            <Label text="Employee ID" />
            <input
              className="input"
              value={form.employee_id}
              onChange={(e) => setForm((prev) => ({ ...prev, employee_id: e.target.value }))}
              placeholder="Employee ID"
            />

            <Label text="Date" />
            <input
              className="input"
              type="date"
              value={form.transaction_date}
              onChange={(e) => setForm((prev) => ({ ...prev, transaction_date: e.target.value }))}
            />

            <Label text="Remark" />
            <textarea
              className="input min-h-20"
              value={form.remark}
              onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
              placeholder="Remark"
            />

            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
            >
              {saving ? "Saving..." : "Save Transaction"}
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Upload Evidence Files</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Evidence only (no OCR). Upload PDF and multiple photos.
          </p>

          {uploadMessage && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              {uploadMessage}
            </div>
          )}

          {uploadError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
              {uploadError}
            </div>
          )}

          <form onSubmit={onUploadEvidence} className="mt-4 space-y-3">
            <Label text="Transaction" />
            <select
              className="input"
              value={selectedTransactionId}
              onChange={(e) => setSelectedTransactionId(e.target.value)}
              required
            >
              <option value="">Select Transaction</option>
              {transactions.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.asset_no} - {tr.transaction_type} - {new Date(tr.created_at).toLocaleString()}
                </option>
              ))}
            </select>

            <Label text="PDF Evidence (PDF)" />
            <input
              key={`pdf-${fileInputKey}`}
              className="input"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => onPdfChange(e.target.files?.[0] ?? null)}
            />
            {pdfFile && (
              <p className="text-xs text-slate-600 dark:text-slate-300">Selected PDF: {pdfFile.name}</p>
            )}

            <Label text="Photos (JPG, PNG, HEIC)" />
            <input
              key={`photo-${fileInputKey}`}
              className="input"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,.heic,.heif"
              multiple
              onChange={(e) => onPhotosChange(Array.from(e.target.files ?? []))}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Max {MAX_PHOTO_COUNT} photos, each file up to {MAX_FILE_SIZE_MB}MB.
            </p>

            {photoPreviewUrls.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Image preview before save
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {photoPreviewUrls.map((url, idx) => (
                    <img
                      key={`${url}-${idx}`}
                      src={url}
                      alt={`preview-${idx + 1}`}
                      className="h-24 w-full rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                    />
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
            >
              {uploading ? "Uploading..." : "Upload Evidence"}
            </button>
          </form>

          <div className="mt-5">
            <h3 className="text-sm font-semibold">Uploaded Files</h3>
            {uploadedFiles.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No files uploaded for this transaction</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {uploadedFiles.map((file) => {
                  const isImage = file.file_type.includes("image") || /\.(png|jpg|jpeg|heic|heif)$/i.test(file.file_url);
                  return (
                    <li key={file.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-blue-700 underline dark:text-blue-300"
                      >
                        {file.file_type}
                      </a>
                      <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{file.file_url}</p>
                      {isImage && (
                        <img
                          src={file.file_url}
                          alt="evidence preview"
                          className="mt-2 h-24 w-24 rounded-md border border-slate-200 object-cover dark:border-slate-700"
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

function Label({ text }: { text: string }) {
  return <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">{text}</label>;
}
