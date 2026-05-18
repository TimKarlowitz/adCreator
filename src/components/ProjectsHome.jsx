'use client';

import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { listProjects, deleteProject, getLastOpenedId, getProject, setLastOpenedId } from '@/lib/projectStorage';
import { exportProjectAsJSON, importProjectFromFile } from '@/lib/projectExport';
import { saveProject } from '@/lib/projectStorage';
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

function AspectRatioIcon({ ratio }) {
  const configs = {
    '1:1':  { w: 20, h: 20 },
    '16:9': { w: 28, h: 16 },
    '9:16': { w: 16, h: 28 },
  };
  const c = configs[ratio] || { w: 20, h: 20 };
  return (
    <svg width={c.w} height={c.h} viewBox={`0 0 ${c.w} ${c.h}`} fill="none">
      <rect x="0.5" y="0.5" width={c.w - 1} height={c.h - 1} rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ProjectCard({ project, onOpen, onDelete, onExport, onRename, onABTest, isLast }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const inputRef = useRef();

  const commitRename = () => {
    setEditing(false);
    if (name.trim() && name !== project.name) onRename(project.id, name.trim());
  };

  return (
    <div className={`group relative bg-[#161616] rounded-xl border overflow-hidden flex flex-col transition-all duration-200 hover:border-[#444] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 ${isLast ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' : 'border-[#2a2a2a]'}`}>
      {isLast && (
        <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-600/80 text-white tracking-wide">
          LAST OPENED
        </div>
      )}

      {/* Thumbnail */}
      <div
        className="relative bg-[#0d0d0d] cursor-pointer overflow-hidden"
        style={{ aspectRatio: (() => {
          const r = project.canvasConfig?.aspectRatio;
          if (r === '16:9') return '16/9';
          if (r === '9:16') return '9/16';
          return '1/1';
        })() }}
        onClick={() => onOpen(project)}
      >
        {project.thumbnail ? (
          <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-700">
            <AspectRatioIcon ratio={project.canvasConfig?.aspectRatio} />
            <span className="text-[10px]">No preview</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-white text-xs font-semibold bg-indigo-600 px-4 py-1.5 rounded-lg shadow-lg">
            Open
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setEditing(false); setName(project.name); }
            }}
            autoFocus
            className="bg-[#111] border border-indigo-500 rounded px-2 py-0.5 text-white text-sm w-full focus:outline-none"
          />
        ) : (
          <p
            className="text-sm text-white font-medium truncate cursor-text hover:text-indigo-300 transition-colors leading-snug"
            title="Click to rename"
            onClick={() => setEditing(true)}
          >
            {project.name}
          </p>
        )}
        <div className="flex items-center gap-2 text-[10px] text-gray-600">
          <span className="flex items-center gap-1">
            <span className="text-gray-700">
              <AspectRatioIcon ratio={project.canvasConfig?.aspectRatio} />
            </span>
            {project.canvasConfig?.aspectRatio}
          </span>
          <span>·</span>
          <span>{project.elements?.length ?? 0} elements</span>
          {project.updatedAt && (
            <>
              <span>·</span>
              <span>{timeAgo(project.updatedAt)}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex gap-1.5">
        <button
          onClick={() => onOpen(project)}
          className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
        >
          Open
        </button>
        <button
          onClick={() => onABTest(project)}
          className="px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-indigo-900/30 text-gray-400 hover:text-indigo-400 text-xs transition-colors"
          title="Open A/B Test"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
        </button>
        <button
          onClick={() => onExport(project)}
          className="px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] text-gray-400 hover:text-white text-xs transition-colors"
          title="Export as JSON"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(project.id)}
          className="px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-red-900/30 text-gray-500 hover:text-red-400 text-xs transition-colors"
          title="Delete project"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function ProjectsHome({ onEnterEditor, onEnterABTest }) {
  const { loadProject, newProject } = useProjectStore();
  const [projects, setProjects] = useState([]);
  const [lastOpenedId, setLastOpenedIdState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef();

  useEffect(() => {
    async function init() {
      const [all, lastId] = await Promise.all([listProjects(), getLastOpenedId()]);
      setProjects(all);
      setLastOpenedIdState(lastId);
      setLoading(false);
    }
    init();
  }, []);

  const handleOpen = async (project) => {
    loadProject(project);
    await setLastOpenedId(project.id);
    onEnterEditor();
  };

  const handleOpenABTest = async (project) => {
    loadProject(project);
    await setLastOpenedId(project.id);
    onEnterABTest?.();
  };

  const handleNewProject = () => {
    newProject();
    onEnterEditor();
  };

  const handleDelete = async (projectId) => {
    await deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
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
      loadProject(imported);
      await setLastOpenedId(imported.id);
      onEnterEditor();
    } catch (err) {
      setImportError(err.message);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d0d0d] overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 h-14 bg-[#111] border-b border-[#1e1e1e] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="white" />
              <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.7" />
              <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.7" />
              <rect x="9" y="9" width="5" height="5" rx="1" fill="white" />
            </svg>
          </div>
          <span className="font-semibold text-white text-sm tracking-tight">AdCreator</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleImportClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all"
            title="Import a .adcreator.json file"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" transform="rotate(180 12 12)" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import JSON
          </button>
          <input ref={fileInputRef} type="file" accept=".json,.adcreator.json" className="hidden" onChange={handleFileChange} />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-10">

          {/* Page heading */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">My Projects</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {loading ? 'Loading…' : projects.length === 0 ? 'No projects yet — create your first one' : `${projects.length} project${projects.length === 1 ? '' : 's'}`}
              </p>
            </div>

            <button
              onClick={handleNewProject}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-900/30 hover:shadow-indigo-900/50 hover:-translate-y-px"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Project
            </button>
          </div>

          {importError && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 text-sm">
              {importError}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-32">
              <span className="w-5 h-5 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#161616] border border-[#2a2a2a] flex items-center justify-center mb-5">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Start your first project</h3>
              <p className="text-gray-500 text-sm max-w-xs mb-8">
                Create a new ad asset or import an existing project file to get started.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleNewProject}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-900/30"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New Project
                </button>
                <button
                  onClick={handleImportClick}
                  className="px-6 py-2.5 rounded-xl bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] hover:border-[#3a3a3a] text-gray-300 hover:text-white text-sm font-medium transition-all"
                >
                  Import JSON
                </button>
              </div>
            </div>
          ) : (
            /* Projects grid */
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {/* New project card */}
              <button
                onClick={handleNewProject}
                className="group bg-[#111] rounded-xl border border-dashed border-[#2a2a2a] hover:border-indigo-500/50 hover:bg-[#13131e] transition-all flex flex-col items-center justify-center gap-3 min-h-[160px] cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] group-hover:bg-indigo-600/20 border border-[#2a2a2a] group-hover:border-indigo-500/50 flex items-center justify-center transition-all">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600 group-hover:text-indigo-400 transition-colors">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <span className="text-xs text-gray-600 group-hover:text-indigo-400 font-medium transition-colors">New Project</span>
              </button>

              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  isLast={p.id === lastOpenedId}
                  onOpen={handleOpen}
                  onDelete={handleDelete}
                  onExport={handleExport}
                  onRename={handleRename}
                  onABTest={handleOpenABTest}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
