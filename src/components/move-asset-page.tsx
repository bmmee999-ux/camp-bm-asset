"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { AssetRow, FileRow, LocationRow } from "@/lib/supabase/types";

type ApiResponse<T = unknown> = {
  ok: boolean;
  message?: string;
  data?: T;
};

type MoveAssetResponse = {
  location: LocationRow;
  files: FileRow[];
};

const MAX_FILE_SIZE_MB = 20;
const MAX_FILES = 20;

function toIsoLocalDate(dateString: string) {
  if (!dateString) return new Date().toISOString();
  return new Date(`${dateString}T00:00:00`).toISOString();
}

function buildGoogleMapsLink(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) return null;
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function parseGpsText(text: string) {
  const match = text
    .trim()
    .match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);

  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

export function MoveAssetPage() {
  const [assetNo, setAssetNo] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [moveDate, setMoveDate] = useState(new Date().toISOString().slice(0, 10));
  const [remark, setRemark] = useState("");
  const [gpsLocation, setGpsLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [savedFiles, setSavedFiles] = useState<FileRow[]>([]);
  const [recentMoves, setRecentMoves] = useState<LocationRow[]>([]);

  const [allFiles, setAllFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  const imagePreviewUrls = useMemo(() => {
    return allFiles
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      }));
  }, [allFiles]);

  const googleMapsLink = useMemo(() => buildGoogleMapsLink(latitude, longitude), [latitude, longitude]);

  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [imagePreviewUrls]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/assets", { cache: "no-store" });
        const body = (await response.json()) as ApiResponse<AssetRow[]>;
        if (!response.ok || !body.ok) throw new Error(body.message ?? "Unable to load assets");
        setAssets(body.data ?? []);
      } catch {
        // silent
      }
    })();

    void loadRecentMoves();
  }, []);

  async function loadRecentMoves() {
    const response = await fetch("/api/locations", { cache: "no-store" });
    const body = (await response.json()) as ApiResponse<LocationRow[]>;
    if (!response.ok || !body.ok) throw new Error(body.message ?? "Unable to load moves");
    setRecentMoves((body.data ?? []).slice(0, 10));
  }

  useEffect(() => {
    const found = assets.find((asset) => asset.asset_no === assetNo.trim());
    if (found) {
      setCurrentLocation(found.current_location);
    }
  }, [assetNo, assets]);

  function addFiles(files: File[]) {
    setError(null);

    const allowed = files.filter((file) => {
      const name = file.name.toLowerCase();
      return (
        file.type === "application/pdf" ||
        file.type === "image/jpeg" ||
        file.type === "image/jpg" ||
        file.type === "image/png" ||
        file.type === "image/heic" ||
        file.type === "image/heif" ||
        name.endsWith(".pdf") ||
        name.endsWith(".jpg") ||
        name.endsWith(".jpeg") ||
        name.endsWith(".png") ||
        name.endsWith(".heic") ||
        name.endsWith(".heif")
      );
    });

    if (allowed.length !== files.length) {
      setError("Only PDF, JPG, PNG, and HEIC files are allowed.");
    }

    const oversized = allowed.find((file) => file.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (oversized) {
      setError(`${oversized.name} exceeds ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    setAllFiles((prev) => {
      const merged = [...prev, ...allowed];
      if (merged.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} evidence files are allowed.`);
        return prev;
      }
      return merged;
    });
  }

  function onTakePhotoClick() {
    photoInputRef.current?.click();
  }

  function onUploadEvidenceClick() {
    evidenceInputRef.current?.click();
  }

  function onGetCurrentLocation() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported on this device");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setGpsLocation(`${lat}, ${lng}`);
      },
      () => {
        setError("Unable to get current GPS location");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!assetNo.trim()) {
      setError("Asset No is required");
      return;
    }

    if (!newLocation.trim()) {
      setError("New Location is required");
      return;
    }

    setSaving(true);

    try {
      const payload = new FormData();
      payload.append("asset_no", assetNo.trim());
      payload.append("current_location", currentLocation.trim());
      payload.append("new_location", newLocation.trim());
      payload.append("move_date", toIsoLocalDate(moveDate));
      payload.append("remark", remark.trim());
      payload.append("gps_location", gpsLocation.trim());
      if (latitude !== null) payload.append("latitude", String(latitude));
      if (longitude !== null) payload.append("longitude", String(longitude));

      allFiles.forEach((file) => payload.append("evidence", file));

      const response = await fetch("/api/move-asset", {
        method: "POST",
        body: payload,
      });

      const body = (await response.json()) as ApiResponse<MoveAssetResponse>;
      if (!response.ok || !body.ok) {
        throw new Error(body.message ?? "Unable to save move history");
      }

      setMessage("Move history saved successfully");
      setSavedFiles(body.data?.files ?? []);
      setAllFiles([]);
      setRemark("");
      setNewLocation("");
      await loadRecentMoves();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save move history");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-screen-sm overflow-x-hidden bg-slate-100 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="space-y-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-semibold">Move Asset</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Save move history, update asset current location, and upload evidence files.
          </p>

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
            <Label text="Asset No" />
            <input
              className="input"
              value={assetNo}
              onChange={(e) => setAssetNo(e.target.value)}
              placeholder="Asset No"
              list="asset-nos"
              required
            />
            <datalist id="asset-nos">
              {assets.map((asset) => (
                <option key={asset.id} value={asset.asset_no} />
              ))}
            </datalist>

            <Label text="Current Location" />
            <input
              className="input"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder="Current Location"
            />

            <Label text="New Location" />
            <input
              className="input"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="New Location"
              required
            />

            <Label text="Move Date" />
            <input
              className="input"
              type="date"
              value={moveDate}
              onChange={(e) => setMoveDate(e.target.value)}
            />

            <Label text="Remark" />
            <textarea
              className="input min-h-20"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Remark"
            />

            <Label text="GPS Location" />
            <input
              className="input"
              value={gpsLocation}
              onChange={(e) => {
                const value = e.target.value;
                setGpsLocation(value);
                const parsed = parseGpsText(value);
                if (parsed) {
                  setLatitude(parsed.lat);
                  setLongitude(parsed.lng);
                }
              }}
              placeholder="latitude, longitude"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label text="Latitude" />
                <input
                  className="input"
                  type="number"
                  step="any"
                  value={latitude ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    const lat = value ? Number(value) : null;
                    setLatitude(lat);
                    if (lat !== null && longitude !== null) {
                      setGpsLocation(`${lat}, ${longitude}`);
                    }
                  }}
                  placeholder="Latitude"
                />
              </div>
              <div>
                <Label text="Longitude" />
                <input
                  className="input"
                  type="number"
                  step="any"
                  value={longitude ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    const lng = value ? Number(value) : null;
                    setLongitude(lng);
                    if (latitude !== null && lng !== null) {
                      setGpsLocation(`${latitude}, ${lng}`);
                    }
                  }}
                  placeholder="Longitude"
                />
              </div>
            </div>

            {googleMapsLink && (
              <a
                href={googleMapsLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center rounded-xl border border-blue-300 px-4 py-3 text-sm font-semibold text-blue-700 dark:border-blue-700 dark:text-blue-300"
              >
                Open location in Google Maps
              </a>
            )}

            <button
              type="button"
              onClick={onGetCurrentLocation}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold dark:border-slate-700"
            >
              Get Current Location
            </button>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,.heic,.heif"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
            />

            <button
              type="button"
              onClick={onTakePhotoClick}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold dark:border-slate-700"
            >
              Take Photo
            </button>

            <input
              ref={evidenceInputRef}
              type="file"
              accept="application/pdf,.pdf,image/jpeg,image/jpg,image/png,image/heic,image/heif,.heic,.heif"
              multiple
              className="hidden"
              onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
            />

            <button
              type="button"
              onClick={onUploadEvidenceClick}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold dark:border-slate-700"
            >
              Upload Evidence
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Allowed: PDF, JPG, PNG, HEIC • max {MAX_FILES} files • up to {MAX_FILE_SIZE_MB}MB each
            </p>

            {allFiles.length > 0 && (
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-sm font-semibold">Selected evidence files</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {allFiles.map((file, idx) => (
                    <li key={`${file.name}-${idx}`}>
                      {file.name} ({Math.round(file.size / 1024)} KB)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {imagePreviewUrls.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Photo preview before save</p>
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviewUrls.map((item, idx) => (
                    <img
                      key={`${item.name}-${idx}`}
                      src={item.url}
                      alt={item.name}
                      className="h-24 w-full rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                    />
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
            >
              {saving ? "Saving..." : "Save move history"}
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold">Uploaded file list after save</h2>
          {savedFiles.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No uploaded files yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {savedFiles.map((file) => (
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
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold">Recent move history</h2>
          <ul className="mt-3 space-y-2">
            {recentMoves.map((move) => (
              <li key={move.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                <p className="font-medium">{move.asset_no}</p>
                <p className="text-slate-600 dark:text-slate-300">
                  {move.old_location ?? "-"} → {move.new_location}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(move.move_date).toLocaleString()} • {move.latitude ?? "-"}, {move.longitude ?? "-"}
                </p>
                {move.latitude !== null && move.longitude !== null && (
                  <a
                    href={`https://www.google.com/maps?q=${move.latitude},${move.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs text-blue-700 underline dark:text-blue-300"
                  >
                    Open on Google Maps
                  </a>
                )}
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}

function Label({ text }: { text: string }) {
  return <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">{text}</label>;
}
