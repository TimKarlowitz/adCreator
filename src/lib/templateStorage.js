const PREFIX = 'ad-editor-template:';

export function saveTemplate(project) {
  const key = PREFIX + project.id;
  localStorage.setItem(key, JSON.stringify(project));
  return key;
}

export function loadTemplate(id) {
  const key = PREFIX + id;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

export function listTemplates() {
  const templates = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(PREFIX)) {
      try {
        const project = JSON.parse(localStorage.getItem(key));
        templates.push(project);
      } catch (e) {
        // skip corrupted entries
      }
    }
  }
  return templates.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

export function deleteTemplate(id) {
  localStorage.removeItem(PREFIX + id);
}
