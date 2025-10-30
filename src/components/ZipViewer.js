import React, { useEffect, useState } from "react";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist";

// Point PDF.js at the local worker (served from /public)
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.mjs`;

const ZIP_MARK = "!/";
const isZipName = (n) => n.toLowerCase().endsWith(".zip");
const isPdfName = (n) => n.toLowerCase().endsWith(".pdf");

const LIMITS = {
  maxDepth: 5,
  maxFiles: 3000,
  maxTotalBytes: 300 * 1024 * 1024, // 300 MB
};

// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- helpers ---

async function extractPdfText(blob) {
  const buf = await blob.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let out = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it) => (typeof it?.str === "string" ? it.str : "")).join(" ") + "\n";
  }
  return out.trim();
}

// "word1+word2+..." (collapse whitespace)
function plusJoin(text) {
  return text.split(/\s+/g).filter(Boolean).join("+");
}

let total = 0;

// POST to API and parse: const prediction = <number>;
async function fetchPrediction(plusJoined) {
  const resp = await fetch("https://ghostbuster-api-gm7xhurxnq-uw.a.run.app", {
    method: "POST",
    headers: {
        "Host": "ghostbuster-api-gm7xhurxnq-uw.a.run.app",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": "600",
        "Origin": "https://ghostbuster-api-gm7xhurxnq-uw.a.run.app",
        "Alt-Used": "ghostbuster-api-gm7xhurxnq-uw.a.run.app",
        "Connection": "keep-alive",
        "Referer": "https://ghostbuster-api-gm7xhurxnq-uw.a.run.app/",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "iframe",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Priority": "u=4",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
        "TE": "trailers"
    },
    body: `content=${plusJoined}`,
  });
  const raw = await resp.text(); // HTML response
  console.log("response", raw);
  const match = raw.match(/const\s+prediction\s*=\s*([0-9]*\.?[0-9]+)\s*;/i);
  if (!match) return undefined;
  const val = parseFloat(match[1]);
  return Number.isFinite(val) ? val : undefined;
}

// Count PDFs recursively (including nested ZIPs) to drive progress by file count
async function countPdfsRecursively(buffer, base, depth) {
  if (depth > LIMITS.maxDepth) return 0;
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.entries(zip.files);
  let totalPdfCount = 0;
  for (const [relPath, entry] of entries) {
    if (entry.dir) continue;
    if (isZipName(relPath)) {
      const nestedBlob = await entry.async("blob");
      const nestedBuf = await nestedBlob.arrayBuffer();
      totalPdfCount += await countPdfsRecursively(nestedBuf, `${base ? base : ""}${relPath}${ZIP_MARK}`, depth + 1);
      continue;
    }
    if (isPdfName(relPath)) totalPdfCount += 1;
  }
  return totalPdfCount;
}

// Recursive unzipper that processes PDFs along the way
async function extractZipRecursively(buffer, base, depth, counters, onPdf, onProgress, _unusedTotalBytes, totalPdfs) {
  if (depth > LIMITS.maxDepth) return [];

  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.entries(zip.files).sort((a, b) => a[0].localeCompare(b[0]));
  const out = [];

  for (const [relPath, entry] of entries) {
    if (entry.dir) continue;
    if (counters.files >= LIMITS.maxFiles) break;

    const fullPath = base ? `${base}${relPath}` : relPath;

    if (isZipName(relPath)) {
      const nestedBlob = await entry.async("blob");
      counters.bytes += nestedBlob.size;
      if (counters.bytes > LIMITS.maxTotalBytes) break;

      const nestedBuf = await nestedBlob.arrayBuffer();
      const nestedBase = `${fullPath}${ZIP_MARK}`;
      const nestedItems = await extractZipRecursively(
        nestedBuf,
        nestedBase,
        depth + 1,
        counters,
        onPdf,
        onProgress,
        _unusedTotalBytes,
        totalPdfs
      );
      out.push(...nestedItems);
      continue;
    }

    // Ensure we keep the correct PDF MIME type when building preview URLs
    const arrayBuffer = await entry.async("arraybuffer");
    const blob = new Blob([arrayBuffer], {
      type: isPdfName(relPath) ? "application/pdf" : undefined,
    });
    counters.bytes += blob.size;
    if (counters.bytes > LIMITS.maxTotalBytes) break;

    const isPdf = isPdfName(relPath);
    let prediction;

    if (isPdf) {
      try {
        const text = await extractPdfText(blob);
        const plus = plusJoin(text);
        prediction = await fetchPrediction(plus);
        console.log(`📄 ${fullPath}`);
        console.log("→ plus-joined sample:", plus.slice(0, 200) + (plus.length > 200 ? "…" : ""));
        console.log("→ prediction:", prediction);
      } catch (err) {
        console.error(`PDF processing failed for ${fullPath}:`, err);
        }
        const url = URL.createObjectURL(blob);
        out.push({
            path: fullPath.split("/").pop().slice(0, -4) + `-${total}.pdf`,
            name: fullPath.split("/").pop().slice(0, -4) + `-${total}.pdf`,
            isPdf,
            size: blob.size,
            prediction,
            url
        });
        total += 1;
        counters.processedPdfs = (counters.processedPdfs || 0) + 1;
        if (onProgress && totalPdfs > 0) {
          const pct = Math.floor((counters.processedPdfs / totalPdfs) * 100);
          onProgress(Math.min(99, pct));
        }
    }


    counters.files += 1;
  }

  return out;
}

export default function ZipViewer() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [nameFilter, setNameFilter] = useState("");
  const [minPredFilter, setMinPredFilter] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name | prediction | size
  const [sortDir, setSortDir] = useState("asc"); // asc | desc
  // Side panel preview removed; use modal instead
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUrl, setModalUrl] = useState(null);
  const [namesByPath, setNamesByPath] = useState({}); // path -> "Nom prénom"

  // setPreviewSafe removed; modal is the preview mechanism

  // Revoke item object URLs when the items list is replaced or on unmount
  useEffect(() => {
    return () => {
      try {
        if (Array.isArray(items)) {
          for (const it of items) {
            if (it && it.url) URL.revokeObjectURL(it.url);
          }
        }
      } catch (_) {}
    };
  }, [items]);

  function openModal(url) {
    setModalUrl(url);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e) {
      if (e.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  function formatPrediction(pred) {
    if (typeof pred !== "number" || !Number.isFinite(pred)) return "—";
    // assume prediction is 0..1; if already 0..100, keep as-is
    const pct = pred <= 1 ? pred * 100 : pred;
    return `${pct.toFixed(2)}%`;
  }

  function formatSize(bytes) {
    if (typeof bytes !== "number" || !Number.isFinite(bytes)) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function toggleSort(column) {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  function renderSort(column) {
    if (sortBy !== column) return null;
    return <span className="ml-1 text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>;
  }

  function filteredAndSorted(list, nameQ, minPred, by, dir) {
    const q = (nameQ || "").toLowerCase().trim();
    const min = minPred === "" ? null : parseFloat(minPred);
    const filtered = list.filter((it) => {
      const nameStr = (it.name || it.path || "").toLowerCase();
      const passName = q === "" || nameStr.includes(q);
      const predVal = typeof it.prediction === "number" ? (it.prediction <= 1 ? it.prediction * 100 : it.prediction) : null;
      const passPred = min === null || (predVal !== null && predVal >= min);
      return passName && passPred;
    });
    const sorted = filtered.sort((a, b) => {
      let av, bv;
      if (by === "name") {
        av = (a.name || a.path || "").toLowerCase();
        bv = (b.name || b.path || "").toLowerCase();
      } else if (by === "prediction") {
        const ap = typeof a.prediction === "number" ? (a.prediction <= 1 ? a.prediction * 100 : a.prediction) : -Infinity;
        const bp = typeof b.prediction === "number" ? (b.prediction <= 1 ? b.prediction * 100 : b.prediction) : -Infinity;
        av = ap;
        bv = bp;
      } else {
        av = a.size || 0;
        bv = b.size || 0;
      }
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  function onChangeName(path, value) {
    setNamesByPath((prev) => ({ ...prev, [path]: value }));
  }

  function exportToExcel() {
    const rows = filteredAndSorted(items, nameFilter, minPredFilter, sortBy, sortDir);
    const headers = ["Nom", "Prediction", "Taille", "Nom prénom"];
    const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const trHeader = `<tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;
    const trRows = rows
      .map((it) => {
        const name = it.name || it.path || "";
        const pred = formatPrediction(it.prediction);
        const size = formatSize(it.size);
        const person = namesByPath[it.path] || "";
        return `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(pred)}</td><td>${escapeHtml(size)}</td><td>${escapeHtml(person)}</td></tr>`;
      })
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><table>${trHeader}${trRows}</table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lexa-guard-export-${Date.now()}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const onPick = async (file) => {
    if (!file) return;
    setItems([]);
    setError(null);
    setLoading(true);
    setProgress(0);
    // Clear modal
    setModalOpen(false);
    setModalUrl(null);

    const counters = { files: 0, bytes: 0 };

    try {
      total = 0;
      const buf = await file.arrayBuffer();
      const topBase = `${file.name}${ZIP_MARK}`;
      // Pre-count total PDFs to process for file-count-based progress
      const totalPdfs = await countPdfsRecursively(buf, topBase, 1);
      const result = await extractZipRecursively(
        buf,
        topBase,
        1,
        counters,
        async () => {},
        (p) => setProgress(p),
        /* _unusedTotalBytes */ file.size,
        totalPdfs
      );
      setItems(result);
      console.log(`✅ Finished. Files processed: ${result.length}`);
      setProgress(100);
      if (counters.bytes > LIMITS.maxTotalBytes) {
        console.warn("Stopped due to size limit.");
      }
      if (counters.files > LIMITS.maxFiles) {
        console.warn("Stopped due to file count limit.");
      }
    } catch (e) {
      setError(e?.message || "Failed to process archive");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col pt-24 w-full h-full items-center justify-center">
    <div className="flex flex-col items-center justify-center w-full h-full">
    <div className="flex flex-col items-center justify-center">
      <h1 className="mb-4 text-4xl font-extrabold  leading-none tracking-tight">
        ✍️ Lexa Guard
      </h1>
      <p className="text-gray-200">
        Pour lutter contre la fraude aux projets de français.
      </p>
    </div>

      {items.length === 0 && <label
    htmlFor="File"
    className="flex flex-col items-center rounded border border-gray-300 p-4 shadow-sm sm:p-6 dark:border-gray-700 bg-transparent text-white w-5/12"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      className="size-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m0-3-3-3m0 0-3 3m3-3v11.25m6-2.25h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75"
      />
    </svg>

    <span className="mt-4 text-lg font-medium dark:text-white">Importer le zip</span>

<span
  className="mt-2 text-base inline-block rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-center font-medium text-gray-700 shadow-sm hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
>
  Parcourir les fichiers
</span>

<input multiple type="file" id="File" className="sr-only" accept=".zip,application/zip" onChange={(e) => onPick(e.target.files?.[0])} />

  </label>}

      { loading && (
        <div className="mt-4 gap-4 flex flex-col w-5/12 justify-center items-center">
          <p className="text-lg text-gray-200">⏳ En cours de traitement...</p>
        <div className=" w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${loading ? Math.min(progress, 99) : progress}%` }}>  
        </div>
        </div>
</div>)}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {items.length > 0 && (
        <div className="flex flex-col items-center gap-8 w-full h-full pt-12">
          <h3 className="text-2xl font-bold">🧪 Résultats</h3>

          <div className="flex justify-end">
              <button
                className="mt-2 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={exportToExcel}
              >
                Exporter pour Excel (en .xls)
              </button>
            </div>

          <div className="w-3/4 gap-4 items-start">
            <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <label className="block text-sm text-gray-300">Filtrer par nom</label>
                <input
                  type="text"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="w-full rounded border border-gray-600 bg-transparent px-3 py-2 text-white"
                  placeholder="Nom contient..."
                />
              </div>
              <div className="w-48">
                <label className="block text-sm text-gray-300">Prediction min (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={minPredFilter}
                  onChange={(e) => setMinPredFilter(e.target.value)}
                  className="w-full rounded border border-gray-600 bg-transparent px-3 py-2 text-white"
                  placeholder="ex: 50"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded border border-gray-700">
              <table className="min-w-full text-left text-sm text-gray-200">
                <thead className="bg-gray-800 text-gray-300">
                  <tr>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort("name")}>Nom {renderSort("name")}</th>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort("prediction")}>Prediction {renderSort("prediction")}</th>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort("size")}>Taille {renderSort("size")}</th>
                    <th className="px-4 py-3">Nom prénom</th>
                    <th className="px-4 py-3">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSorted(items, nameFilter, minPredFilter, sortBy, sortDir).map((it) => (
                    <tr key={it.path} className="border-t border-gray-700 hover:bg-gray-800/60">
                      <td className="px-4 py-3 break-all">{it.name || it.path}</td>
                      <td className="px-4 py-3" style={{ color: it.prediction > 0.85 ? "red" : it.prediction > 0.70 ? "orange" : "green" }}>{formatPrediction(it.prediction)}</td>
                      <td className="px-4 py-3">{formatSize(it.size)}</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={namesByPath[it.path] || ""}
                          onChange={(e) => onChangeName(it.path, e.target.value)}
                          className="w-full rounded border border-gray-600 bg-transparent px-2 py-1 text-white"
                          placeholder="Nom prénom"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {it.url ? (
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                              onClick={() => openModal(it.url)}
                            >
                              Voir le pdf
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>

            {/* Side panel removed; modal is used instead */}
                </div>
        </div>
      )}
    </div>

    {modalOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="relative w-11/12 h-[85vh] max-w-5xl bg-gray-900 rounded shadow-lg border border-gray-700 overflow-hidden">
          <button
            className="absolute top-2 right-2 px-2.5 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm"
            onClick={closeModal}
          >
            Fermer
          </button>
          {modalUrl ? (
            <embed title="PDF Modal" src={modalUrl} type="application/pdf" className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">Aucun document</div>
          )}
        </div>
      </div>
    )}
    
    </div>
  );
}
