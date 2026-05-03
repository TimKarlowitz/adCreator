'use client';

import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { listProjects, saveProject, deleteProject, setLastOpenedId } from '@/lib/projectStorage';
import { exportProjectAsJSON, importProjectFromFile } from '@/lib/projectExport';
import { listTemplates, deleteTemplate } from '@/lib/templateStorage';
import { v4 as uuidv4 } from 'uuid';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function ProjectCard({ project, onLoad, onDelete, onExport, onRename }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const inputRef = useRef();

  const commitRename = () => {
    setEditing(false);
    if (name.trim() && name !== project.name) onRename(project.id, name.trim());
  };

  return (
    <div className="bg-[#111] rounded-lg border border-[#2a2a2a] overflow-hidden hover:border-[#444] transition-colors group flex flex-col">
      {/* Thumbnail */}
      <div
        className="aspect-video bg-[#0a0a0a] cursor-pointer relative"
        onClick={() => onLoad(project)}
      >
        {project.thumbnail ? (
          <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
            No preview
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-white text-xs font-medium bg-indigo-600 px-3 py-1 rounded">Open</span>
        </div>
      </div>

      {/* Info row */}
      <div className="p-2 flex flex-col gap-1 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false); }}
            autoFocus
            className="bg-[#1a1a1a] border border-indigo-500 rounded px-2 py-0.5 text-white text-sm w-full focus:outline-none"
          />
        ) : (
          <p
            className="text-sm text-white font-medium truncate cursor-text hover:text-indigo-300 transition-colors"
            title="Click to rename"
            onClick={() => setEditing(true)}
          >
            {project.name}
          </p>
        )}
        <p className="text-[10px] text-gray-500">
          {project.canvasConfig?.aspectRatio} · {project.elements?.length ?? 0} elements
          {project.updatedAt ? ` · ${timeAgo(project.updatedAt)}` : ''}
        </p>
      </div>

      {/* Actions */}
      <div className="px-2 pb-2 flex gap-1">
        <button
          onClick={() => onLoad(project)}
          className="flex-1 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
        >
          Open
        </button>
        <button
          onClick={() => onExport(project)}
          className="px-2 py-1 rounded bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-400 hover:text-white text-xs transition-colors"
          title="Export as JSON"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        <button
          onClick={() => onDelete(project.id)}
          className="px-2 py-1 rounded bg-[#1a1a1a] hover:bg-red-900/40 text-gray-500 hover:text-red-400 text-xs transition-colors"
          title="Delete project"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function safeThumb(stageRef) {
  try {
    return stageRef?.current?.toDataURL({ pixelRatio: 0.3 }) ?? null;
  } catch {
    return null;
  }
}

export default function ProjectsModal({ onClose, stageRef, onImport }) {
  const { loadProject } = useProjectStore();
  const [tab, setTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [saveName, setSaveName] = useState(
    () => useProjectStore.getState().name || 'Untitled'
  );
  const [saveError, setSaveError] = useState('');
  const [isSavingAs, setIsSavingAs] = useState(false);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef();

  useEffect(() => {
    if (tab === 'projects') {
      listProjects().then(setProjects);
    } else if (tab === 'templates') {
      setTemplates(listTemplates());
    }
  }, [tab]);

  const handleLoad = async (project) => {
    loadProject(project);
    await setLastOpenedId(project.id);
    onClose();
  };

  const handleDelete = async (projectId) => {
    await deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  const handleDeleteTemplate = (templateId) => {
    deleteTemplate(templateId);
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  };

  const handleExport = (project) => {
    exportProjectAsJSON(project);
  };

  const handleRename = async (projectId, newName) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return;
    const updated = { ...proj, name: newName, updatedAt: Date.now() };
    await saveProject(updated, proj.thumbnail);
    setProjects((prev) => prev.map((p) => p.id === projectId ? updated : p));
  };

  const handleSaveAs = async () => {
    if (isSavingAs) return;
    setSaveError('');
    setIsSavingAs(true);
    try {
      const state = useProjectStore.getState();
      const thumbnail = safeThumb(stageRef);
      const projectData = {
        id: state.id || uuidv4(),
        name: saveName.trim() || 'Untitled',
        canvasConfig: state.canvasConfig,
        background: state.background,
        model3d: state.model3d,
        elements: state.elements,
        exportConfig: state.exportConfig,
      };
      await saveProject(projectData, thumbnail);
      await setLastOpenedId(projectData.id);
      const updated = await listProjects();
      setProjects(updated);
      setTab('projects');
    } catch (err) {
      console.error('Save failed:', err);
      setSaveError(err?.message || 'Save failed. Please try again.');
    } finally {
      setIsSavingAs(false);
    }
  };

  const handleImportClick = () => {
    setImportError('');
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const project = await importProjectFromFile(file);
      const imported = { ...project, id: project.id || uuidv4() };
      await saveProject(imported, null);
      onImport?.(imported);
      onClose();
    } catch (err) {
      setImportError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl w-[680px] max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2a2a2a] flex-shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-white">Projects</h3>
            <div className="flex gap-1 bg-[#111] rounded-lg p-0.5">
              {[
                { id: 'projects', label: 'My Projects' },
                { id: 'templates', label: 'Templates' },
                { id: 'save', label: 'Save As' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    tab === t.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'projects' && (
              <>
                <button
                  onClick={handleImportClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-gray-300 hover:text-white bg-[#111] hover:bg-[#2a2a2a] border border-[#333] transition-colors"
                  title="Import a .adcreator.json file"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10" transform="rotate(180 12 12)"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Import JSON
                </button>
                <input ref={fileInputRef} type="file" accept=".json,.adcreator.json" className="hidden" onChange={handleFileChange} />
              </>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-lg leading-none">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {importError && (
            <div className="mb-3 px-3 py-2 rounded bg-red-900/30 border border-red-700/50 text-red-400 text-xs">
              {importError}
            </div>
          )}

          {/* My Projects tab */}
          {tab === 'projects' && (
            projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-[#111] border border-[#2a2a2a] flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 7V5a2 2 0 0 0-4 0v2"/>
                  </svg>
                </div>
                <p className="text-gray-500 text-sm mb-1">No saved projects yet.</p>
                <p className="text-gray-600 text-xs mb-4">Your work auto-saves as you edit. Use "Save As" to name and keep a version.</p>
                <button
                  onClick={() => setTab('save')}
                  className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"
                >
                  Save Current Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {projects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onLoad={handleLoad}
                    onDelete={handleDelete}
                    onExport={handleExport}
                    onRename={handleRename}
                  />
                ))}
              </div>
            )
          )}

          {/* Templates tab (legacy localStorage) */}
          {tab === 'templates' && (
            templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-gray-500 text-sm">No saved templates yet.</p>
                <p className="text-gray-600 text-xs mt-1">Templates saved previously via the bottom bar appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {templates.map((t) => (
                  <div key={t.id} className="bg-[#111] rounded-lg border border-[#2a2a2a] overflow-hidden hover:border-[#444] transition-colors flex flex-col">
                    <div
                      className="aspect-video bg-[#0a0a0a] cursor-pointer"
                      onClick={() => handleLoad(t)}
                    >
                      {t.thumbnail ? (
                        <img src={t.thumbnail} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No preview</div>
                      )}
                    </div>
                    <div className="p-2 flex flex-col gap-1 flex-1">
                      <p className="text-sm text-white font-medium truncate">{t.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {t.canvasConfig?.aspectRatio} · {t.elements?.length ?? 0} elements
                        {t.savedAt ? ` · ${timeAgo(t.savedAt)}` : ''}
                      </p>
                    </div>
                    <div className="px-2 pb-2 flex gap-1">
                      <button
                        onClick={() => handleLoad(t)}
                        className="flex-1 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="px-2 py-1 rounded bg-[#1a1a1a] hover:bg-red-900/40 text-gray-500 hover:text-red-400 text-xs transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Save As tab */}
          {tab === 'save' && (
            <div className="max-w-sm mx-auto py-6 space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1.5">Project Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => { setSaveName(e.target.value); setSaveError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAs(); }}
                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  placeholder="e.g. Summer Campaign – Square"
                  autoFocus
                />
              </div>
              {saveError && (
                <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/30 rounded px-3 py-2">
                  {saveError}
                </p>
              )}
              <button
                onClick={handleSaveAs}
                disabled={!saveName.trim() || isSavingAs}
                className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                {isSavingAs ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Saving…
                  </>
                ) : 'Save Project'}
              </button>
              <p className="text-xs text-gray-600 text-center">
                Saves a named snapshot to your browser. Auto-save also runs in the background.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
