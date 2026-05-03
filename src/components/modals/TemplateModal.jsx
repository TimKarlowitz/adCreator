'use client';

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { saveTemplate, listTemplates, deleteTemplate } from '@/lib/templateStorage';
import { v4 as uuidv4 } from 'uuid';

export default function TemplateModal({ onClose, stageRef }) {
  const { loadProject, name, setProjectName, ...project } = useProjectStore();
  const [templates, setTemplates] = useState([]);
  const [view, setView] = useState('list'); // 'list' | 'save'
  const [saveName, setSaveName] = useState(name);

  useEffect(() => {
    setTemplates(listTemplates());
  }, []);

  const handleSave = () => {
    const snapshot = stageRef?.current ? stageRef.current.toDataURL({ pixelRatio: 0.3 }) : null;
    const current = useProjectStore.getState();
    const toSave = {
      id: current.id || uuidv4(),
      name: saveName || 'Untitled',
      canvasConfig: current.canvasConfig,
      background: current.background,
      model3d: current.model3d,
      elements: current.elements,
      exportConfig: current.exportConfig,
      savedAt: Date.now(),
      thumbnail: snapshot,
    };
    saveTemplate(toSave);
    setTemplates(listTemplates());
    setView('list');
  };

  const handleLoad = (template) => {
    loadProject(template);
    onClose();
  };

  const handleDelete = (id) => {
    deleteTemplate(id);
    setTemplates(listTemplates());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-white">Templates</h3>
            <div className="flex gap-1">
              {['list', 'save'].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 rounded text-xs capitalize ${view === v ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {v === 'list' ? 'My Templates' : 'Save Current'}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {view === 'save' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Template Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Campaign A - Square"
                  autoFocus
                />
              </div>
              <button
                onClick={handleSave}
                className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
              >
                Save Template
              </button>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-3">No saved templates yet.</p>
              <button
                onClick={() => setView('save')}
                className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
              >
                Save Current Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {templates.map((t) => (
                <div key={t.id} className="bg-[#111] rounded-lg border border-[#2a2a2a] overflow-hidden hover:border-[#444] transition-colors">
                  <div
                    className="aspect-video bg-[#0a0a0a] cursor-pointer"
                    onClick={() => handleLoad(t)}
                  >
                    {t.thumbnail ? (
                      <img src={t.thumbnail} alt={t.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">No preview</div>
                    )}
                  </div>
                  <div className="p-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-medium truncate">{t.name}</p>
                      <p className="text-[10px] text-gray-500">{t.canvasConfig?.aspectRatio} · {t.elements?.length ?? 0} elements</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleLoad(t)}
                        className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="px-2 py-1 rounded bg-[#1a1a1a] hover:bg-red-900/50 text-gray-400 hover:text-red-400 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
