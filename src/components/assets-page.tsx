"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { AssetInsert, AssetImageRow, AssetRow } from "@/lib/supabase/types";

type ApiResponse<T> = {
  ok: boolean;
  message?: string;
  data?: T;
};

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

function isAllowedImage(file: File) {
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

export function AssetsPage() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [images, setImages] = useState<AssetImageRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [assetForm, setAssetForm] = useState<AssetInsert>({
    asset_no: "",
    asset_name: "",
    sap_no: "",
    current_status: "AVAILABLE",
    current_location: "HQ",
    repair_count: 0,
  });
  const [assetPhotos, setAssetPhotos] = useState<File[]>([]);
  const [fileKey, setFileKey] = useState(0);

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [assetsResponse, imagesResponse] = await Promise.all([
        fetch("/api/assets", { cache: "no-store" }),
        fetch("/api/asset-images", { cache: "no-store" }),
      ]);

      const assetsBody = (await assetsResponse.json()) as ApiResponse<AssetRow[]>;
      const imagesBody = (await imagesResponse.json()) as ApiResponse<AssetImageRow[]>;

      if (!assetsResponse.ok || !assetsBody.ok) {
        throw new Error(assetsBody.message ?? "Unable to load assets");
      }

      if (!imagesResponse.ok || !imagesBody.ok) {
        throw new Error(imagesBody.message ?? "Unable to load asset images");
      }

      setAssets(assetsBody.data ?? []);
      setImages(imagesBody.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load assets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const imageByAsset = useMemo(() => {
    const map = new Map<string, AssetImageRow>();
    for (const image of images) {
      if (!map.has(image.asset_no)) {
        map.set(image.asset_no, image);
      }
    }
    return map;
  }, [images]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assets;

    return assets.filter(
      (asset) =>
        asset.asset_no.toLowerCase().includes(term) ||
        asset.asset_name.toLowerCase().includes(term) ||
        asset.current_status.toLowerCase().includes(term) ||
        asset.current_location.toLowerCase().includes(term),
    );
  }, [assets, search]);

  async function onCreateAsset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!assetForm.asset_no?.trim() || !assetForm.asset_name?.trim()) {
      setError("Asset No and Asset Name are required");
      return;
    }

    if (assetPhotos.some((f) => !isAllowedImage(f))) {
      setError("Only JPG, PNG, and HEIC images are allowed");
      return;
    }

    if (assetPhotos.some((f) => f.size > MAX_IMAGE_SIZE)) {
      setError("One or more images exceed 20MB");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...assetForm,
          asset_no: assetForm.asset_no.trim(),
          asset_name: assetForm.asset_name.trim(),
          sap_no: assetForm.sap_no?.trim() || null,
          current_status: assetForm.current_status?.trim() || "AVAILABLE",
          current_location: assetForm.current_location?.trim() || "HQ",
          repair_count: Number(assetForm.repair_count ?? 0),
        }),
      });

      const body = (await response.json()) as ApiResponse<AssetRow>;
      if (!response.ok || !body.ok || !body.data) {
        throw new Error(body.message ?? "Unable to create asset");
      }

      if (assetPhotos.length > 0) {
        const fd = new FormData();
        fd.append("assetNo", body.data.asset_no);
        assetPhotos.forEach((file) => fd.append("images", file));

        const imageRes = await fetch("/api/asset-images", {
          method: "POST",
          body: fd,
        });

        const imageBody = (await imageRes.json()) as ApiResponse<AssetImageRow[]>;
        if (!imageRes.ok || !imageBody.ok) {
          throw new Error(imageBody.message ?? "Asset created but image upload failed");
        }
      }

      setMessage("Asset created successfully. You can continue adding new items.");
      setAssetForm({
        asset_no: "",
        asset_name: "",
        sap_no: "",
        current_status: "AVAILABLE",
        current_location: "HQ",
        repair_count: 0,
      });
      setAssetPhotos([]);
      setFileKey((x) => x + 1);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create asset");
    } finally {
      setCreating(false);
    }
  }

  async function onDeleteAssetImage(imageId: string) {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/asset-images/${imageId}`, { method: "DELETE" });
      const body = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !body.ok) {
        throw new Error(body.message ?? "Unable to delete asset image");
      }

      setMessage("Asset image deleted");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete image");
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-screen-sm overflow-x-hidden bg-slate-100 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold">Assets</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Add assets continuously and attach asset photos</p>

        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={onCreateAsset} className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <h2 className="text-sm font-semibold">Add New Asset</h2>

          <input
            className="input"
            placeholder="Asset No"
            value={assetForm.asset_no}
            onChange={(e) => setAssetForm((v) => ({ ...v, asset_no: e.target.value }))}
            required
          />

          <input
            className="input"
            placeholder="Asset Name"
            value={assetForm.asset_name}
            onChange={(e) => setAssetForm((v) => ({ ...v, asset_name: e.target.value }))}
            required
          />

          <input
            className="input"
            placeholder="SAP No"
            value={assetForm.sap_no ?? ""}
            onChange={(e) => setAssetForm((v) => ({ ...v, sap_no: e.target.value }))}
          />

          <input
            className="input"
            placeholder="Current Status"
            value={assetForm.current_status ?? ""}
            onChange={(e) => setAssetForm((v) => ({ ...v, current_status: e.target.value }))}
          />

          <input
            className="input"
            placeholder="Current Location"
            value={assetForm.current_location ?? ""}
            onChange={(e) => setAssetForm((v) => ({ ...v, current_location: e.target.value }))}
          />

          <label className="block text-xs text-slate-500 dark:text-slate-400">Attach Asset Photos (JPG/PNG/HEIC)</label>
          <input
            key={fileKey}
            className="input"
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif"
            onChange={(e) => setAssetPhotos(Array.from(e.target.files ?? []))}
          />

          {assetPhotos.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">Selected {assetPhotos.length} image(s)</p>
          )}

          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
          >
            {creating ? "Saving..." : "Save Asset"}
          </button>
        </form>

        <div>
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by asset no, name, status, location"
          />
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading assets...</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((asset) => {
              const image = imageByAsset.get(asset.asset_no);
              return (
                <li key={asset.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <Link href={`/assets/${encodeURIComponent(asset.asset_no)}`} className="block">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <Info label="Asset No" value={asset.asset_no} />
                      <Info label="Repair Count" value={String(asset.repair_count)} />
                      <Info label="Asset Name" value={asset.asset_name} full />
                      <Info label="Current Status" value={asset.current_status} />
                      <Info label="Current Location" value={asset.current_location} full />
                    </div>
                  </Link>

                  {image && (
                    <div className="mt-3 flex items-center gap-2">
                      <img
                        src={image.file_url}
                        alt={asset.asset_no}
                        className="h-16 w-16 rounded-md border border-slate-200 object-cover dark:border-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => void onDeleteAssetImage(image.id)}
                        className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white"
                      >
                        Delete photo
                      </button>
                    </div>
                  )}
                </li>
              );
            })}

            {filtered.length === 0 && (
              <li className="rounded-xl border border-slate-200 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No assets found.
              </li>
            )}
          </ul>
        )}
      </section>
    </main>
  );
}

function Info({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : "col-span-1"}>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="break-words font-medium">{value}</p>
    </div>
  );
}
