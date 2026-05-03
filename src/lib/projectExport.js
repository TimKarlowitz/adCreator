/** Trigger a browser download of the project as a .adcreator.json file. */
export function exportProjectAsJSON(project) {
  const data = {
    version: 1,
    id: project.id,
    name: project.name,
    canvasConfig: project.canvasConfig,
    background: project.background,
    model3d: project.model3d,
    elements: project.elements,
    exportConfig: project.exportConfig,
    exportedAt: Date.now(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name || 'project'}.adcreator.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Read a .adcreator.json file selected by the user and return the parsed project object. */
export function importProjectFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.canvasConfig || !Array.isArray(data.elements)) {
          reject(new Error('Invalid project file: missing required fields.'));
          return;
        }
        resolve(data);
      } catch {
        reject(new Error('Could not parse file. Make sure it is a valid .adcreator.json file.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsText(file);
  });
}
