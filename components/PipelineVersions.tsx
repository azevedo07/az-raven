"use client";

import { useEffect, useState } from "react";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Modal from "./ui/Modal";

interface VersionSummary {
  id: string;
  name: string;
  createdAt: string;
}

/**
 * Versões (snapshots) do pipeline de um projeto (Sprint 1.5, Tasks 4 e 5).
 *
 * Client Component deliberado: lista, cria e restaura versões via
 * `fetch` na API pública (`GET`/`POST /api/pipeline/:projectId/versions`,
 * `POST /api/pipeline/:projectId/versions/:versionId/restore`) — nenhum
 * acesso a Prisma, Repository ou PipelineService a partir do navegador.
 */
export default function PipelineVersions({
  projectId,
  onRestored,
}: {
  projectId: string;
  /** Chamado após uma restauração bem-sucedida, para que o pai recarregue Dashboard e Timeline (Sprint 1.5, Task 5). */
  onRestored?: () => void;
}) {
  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [restoringVersion, setRestoringVersion] = useState<VersionSummary | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  async function loadVersions() {
    const response = await fetch(`/api/pipeline/${projectId}/versions`);
    if (!response.ok) {
      throw new Error("Não foi possível carregar as versões do pipeline.");
    }
    setVersions(await response.json());
  }

  useEffect(() => {
    let cancelled = false;

    loadVersions().catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Erro desconhecido.");
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleCreate() {
    if (!name.trim()) return;

    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch(`/api/pipeline/${projectId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!response.ok) {
        throw new Error("Não foi possível criar a versão.");
      }
      await loadVersions();
      setDialogOpen(false);
      setName("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore() {
    if (!restoringVersion) return;

    setRestoring(true);
    setRestoreError(null);
    try {
      const response = await fetch(`/api/pipeline/${projectId}/versions/${restoringVersion.id}/restore`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Não foi possível restaurar esta versão.");
      }
      await loadVersions();
      setRestoringVersion(null);
      onRestored?.();
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[13.5px] font-semibold text-white">
          Versões{versions ? ` (${versions.length})` : ""}
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          NOVA VERSÃO
        </Button>
      </div>

      {error && <div className="text-[12px] text-danger">{error}</div>}

      {!error && versions === null && (
        <div className="text-[12px] text-textTertiary">Carregando versões…</div>
      )}

      {!error && versions !== null && versions.length === 0 && (
        <div className="text-[12px] text-textTertiary">Nenhuma versão salva ainda.</div>
      )}

      {!error && versions !== null && versions.length > 0 && (
        <ul className="flex flex-col gap-0.5">
          {versions.map((version, index) => {
            const date = new Date(version.createdAt);
            return (
              <li
                key={version.id}
                className={[
                  "flex items-center justify-between gap-3 py-2.5",
                  index !== versions.length - 1 ? "border-b border-border" : "",
                ].join(" ")}
              >
                <span className="text-[12.5px] text-white">{version.name}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-textTertiary">
                    {date.toLocaleDateString("pt-BR")} · {date.toLocaleTimeString("pt-BR")}
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => setRestoringVersion(version)}>
                    RESTAURAR
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setFormError(null);
        }}
        title="Nova versão"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={saving} disabled={!name.trim()}>
              Salvar versão
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-textSecondary">Nome da versão</label>
          <input
            className="w-full rounded-sm border border-borderStrong bg-bg2 px-3 py-2.5 text-[13px] text-white outline-none focus:border-accent focus:ring-2 focus:ring-accentSoft"
            placeholder="Ex: Versão Inicial"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {formError && <div className="text-[12px] text-danger">{formError}</div>}
      </Modal>

      <Modal
        open={restoringVersion !== null}
        onClose={() => {
          setRestoringVersion(null);
          setRestoreError(null);
        }}
        title="Restaurar versão"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRestoringVersion(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleRestore} loading={restoring}>
              Restaurar
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-textSecondary">
          Tem certeza que deseja restaurar esta versão
          {restoringVersion ? <> (&quot;{restoringVersion.name}&quot;)</> : null}? O estado atual do pipeline será
          substituído pelo estado salvo nessa versão.
        </p>
        {restoreError && <div className="text-[12px] text-danger">{restoreError}</div>}
      </Modal>
    </Card>
  );
}
