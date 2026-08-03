"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "../ui/Card";
import ProgressBar from "../ui/ProgressBar";
import { useToast } from "../providers/ToastProvider";
import AssetToolbar from "./AssetToolbar";
import AssetFilters, { SortOption, TypeFilter } from "./AssetFilters";
import AssetGrid from "./AssetGrid";
import AssetPreview from "./AssetPreview";
import DeleteDialog from "./DeleteDialog";
import {
  AssetRecord,
  backendTypeFromMime,
  deriveDisplayType,
  extensionFromFileName,
  formatBytes,
  uploadFileWithProgress,
} from "./utils";

interface UploadTask {
  localId: string;
  file: File;
  previewUrl: string | null;
  progress: number;
  status: "creating" | "uploading" | "done" | "error" | "cancelled";
  error?: string;
  xhr?: XMLHttpRequest;
}

/**
 * Biblioteca de Assets (Sprint 2.0) — orquestra busca/filtro/ordenação,
 * upload (com drag & drop, barra de progresso e cancelamento),
 * preview e exclusão. Consome exclusivamente as rotas HTTP já
 * existentes (`/api/assets*`, congeladas nesta Sprint) — nunca importa
 * `AssetService`, `AssetRepository` ou `StorageAdapter`.
 */
export default function AssetLibrary({ projectId }: { projectId: string }) {
  const [assets, setAssets] = useState<AssetRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");

  const [previewAsset, setPreviewAsset] = useState<AssetRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssetRecord | null>(null);
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);

  const { showToast } = useToast();

  const loadAssets = useCallback(async () => {
    try {
      const response = await fetch(`/api/assets?projectId=${encodeURIComponent(projectId)}`);
      if (!response.ok) {
        throw new Error("Não foi possível carregar os assets.");
      }
      const data: AssetRecord[] = await response.json();
      setAssets(data.filter((a) => a.status !== "DELETED"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    }
  }, [projectId]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const visibleAssets = useMemo(() => {
    if (!assets) return null;

    let result = assets;

    if (typeFilter !== "all") {
      result = result.filter((asset) => deriveDisplayType(asset) === typeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((asset) => asset.name.toLowerCase().includes(query));
    }

    const sorted = [...result];
    switch (sortBy) {
      case "newest":
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        break;
      case "size":
        sorted.sort((a, b) => b.size - a.size);
        break;
    }
    return sorted;
  }, [assets, typeFilter, searchQuery, sortBy]);

  const updateUpload = useCallback((localId: string, patch: Partial<UploadTask>) => {
    setUploads((prev) => prev.map((task) => (task.localId === localId ? { ...task, ...patch } : task)));
  }, []);

  const startUpload = useCallback(
    async (file: File) => {
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;

      setUploads((prev) => [
        ...prev,
        { localId, file, previewUrl, progress: 0, status: "creating" },
      ]);

      try {
        const createResponse = await fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            type: backendTypeFromMime(file.type),
            name: file.name,
            originalName: file.name,
            mimeType: file.type || "application/octet-stream",
            extension: extensionFromFileName(file.name),
            size: file.size,
          }),
        });
        if (!createResponse.ok) {
          const body = await createResponse.json().catch(() => null);
          throw new Error(body?.error?.message ?? "Não foi possível registrar o asset.");
        }
        const created: AssetRecord = await createResponse.json();
        updateUpload(localId, { status: "uploading" });

        await uploadFileWithProgress(created.id, file, {
          onProgress: (percent) => updateUpload(localId, { progress: percent }),
          onXhrReady: (xhr) => updateUpload(localId, { xhr }),
        });

        updateUpload(localId, { status: "done", progress: 100 });
        showToast(`"${file.name}" enviado com sucesso.`);
        await loadAssets();
        setTimeout(() => {
          setUploads((prev) => prev.filter((task) => task.localId !== localId));
        }, 2000);
      } catch (err) {
        const cancelled = err instanceof Error && err.name === "AbortError";
        updateUpload(localId, {
          status: cancelled ? "cancelled" : "error",
          error: err instanceof Error ? err.message : "Erro desconhecido.",
        });
        if (!cancelled) {
          showToast(`Falha ao enviar "${file.name}".`);
        }
      }
    },
    [projectId, updateUpload, loadAssets, showToast]
  );

  function handleFilesSelected(files: File[]) {
    files.forEach(startUpload);
  }

  function handleCancelUpload(localId: string) {
    setUploads((prev) => {
      const task = prev.find((t) => t.localId === localId);
      task?.xhr?.abort();
      return prev;
    });
  }

  function dismissUpload(localId: string) {
    setUploads((prev) => prev.filter((task) => task.localId !== localId));
  }

  async function handleDeleteConfirm(asset: AssetRecord) {
    const response = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
    if (!response.ok && response.status !== 204) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error?.message ?? "Não foi possível excluir o asset.");
    }
    setAssets((prev) => (prev ? prev.filter((a) => a.id !== asset.id) : prev));
    setDeleteTarget(null);
    setPreviewAsset((current) => (current?.id === asset.id ? null : current));
    showToast(`"${asset.name}" removido.`);
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copiado.`);
    } catch {
      showToast("Não foi possível copiar para a área de transferência.");
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      dragCounter.current += 1;
      setIsDraggingOver(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDraggingOver(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFilesSelected(files);
  }

  const isUploading = uploads.some((task) => task.status === "creating" || task.status === "uploading");

  return (
    <div
      className="relative flex flex-col gap-4"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-testid="asset-library"
    >
      {isDraggingOver && (
        <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center border-4 border-dashed border-accent bg-black/60">
          <p className="rounded-md bg-panel px-6 py-4 text-[15px] font-semibold text-accent">
            Solte os arquivos para enviar
          </p>
        </div>
      )}

      <AssetToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onFilesSelected={handleFilesSelected}
        uploading={isUploading}
      />

      <AssetFilters typeFilter={typeFilter} onTypeFilterChange={setTypeFilter} sortBy={sortBy} onSortByChange={setSortBy} />

      {uploads.length > 0 && (
        <Card data-testid="upload-queue">
          <div className="flex flex-col gap-2.5">
            {uploads.map((task) => (
              <div key={task.localId} className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-md border border-border bg-[#0b0e13]">
                  {task.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={task.previewUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-textTertiary">{extensionFromFileName(task.file.name) || "?"}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12.5px] text-white">{task.file.name}</span>
                    <span className="flex-none text-[11px] text-textTertiary">{formatBytes(task.file.size)}</span>
                  </div>
                  {(task.status === "creating" || task.status === "uploading") && (
                    <div className="mt-1">
                      <ProgressBar value={task.status === "creating" ? 0 : task.progress} />
                    </div>
                  )}
                  {task.status === "error" && <div className="mt-1 text-[11px] text-danger">{task.error}</div>}
                  {task.status === "cancelled" && (
                    <div className="mt-1 text-[11px] text-textTertiary">Upload cancelado.</div>
                  )}
                  {task.status === "done" && <div className="mt-1 text-[11px] text-success">Concluído.</div>}
                </div>
                {(task.status === "creating" || task.status === "uploading") && (
                  <button
                    type="button"
                    onClick={() => handleCancelUpload(task.localId)}
                    className="flex-none text-[11px] text-textTertiary hover:text-white"
                  >
                    Cancelar
                  </button>
                )}
                {(task.status === "error" || task.status === "cancelled") && (
                  <button
                    type="button"
                    onClick={() => dismissUpload(task.localId)}
                    className="flex-none text-[11px] text-textTertiary hover:text-white"
                  >
                    Descartar
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {error && !assets && (
        <div
          data-testid="asset-library-error"
          className="flex flex-col items-center gap-3 rounded border border-border py-16 text-center"
        >
          <p className="text-[13px] text-danger">{error}</p>
          <button
            type="button"
            onClick={loadAssets}
            className="rounded-sm border border-borderStrong px-3 py-1.5 text-xs text-textSecondary hover:bg-white/[0.06] hover:text-white"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {(!error || assets) && (
        <AssetGrid
          assets={visibleAssets}
          viewMode={viewMode}
          onPreview={setPreviewAsset}
          onDeleteRequest={setDeleteTarget}
          onCopyName={(asset) => copyToClipboard(asset.name, "Nome")}
          onCopyId={(asset) => copyToClipboard(asset.id, "ID")}
          emptyMessage={
            searchQuery || typeFilter !== "all"
              ? "Nenhum asset corresponde aos filtros atuais."
              : "Nenhum asset enviado ainda. Arraste arquivos aqui ou use “Enviar Asset”."
          }
        />
      )}

      <AssetPreview
        asset={previewAsset}
        onClose={() => setPreviewAsset(null)}
        onDeleteRequest={setDeleteTarget}
        onCopyName={(asset) => copyToClipboard(asset.name, "Nome")}
        onCopyId={(asset) => copyToClipboard(asset.id, "ID")}
      />

      <DeleteDialog asset={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteConfirm} />
    </div>
  );
}
