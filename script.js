window.MonacoEnvironment = {
  getWorkerUrl: () =>
    `data:text/javascript;charset=utf-8,` +
    encodeURIComponent(`importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/base/worker/workerMain.js');`)
};

let editor, currentFile = '';
const files = { "main.ts": `function greet(name: string): string {\n  return "Hello, " + name;\n}\nconsole.log(greet("TS"));` };

function openFile(filename) {
  if (currentFile === filename) return;
  currentFile = filename;
  if (!files[filename]) files[filename] = '';
  editor.setValue(files[filename]);
  const lang = filename.split('.').pop();
  const langMap = { js: 'javascript', ts: 'typescript', py: 'python', cpp: 'cpp' };
  monaco.editor.setModelLanguage(editor.getModel(), langMap[lang] || 'javascript');
  renderTabs();
}

function closeFile(filename) {
  delete files[filename];
  if (filename === currentFile) {
    const keys = Object.keys(files);
    if (keys.length > 0) openFile(keys[0]);
    else {
      currentFile = '';
      editor.setValue('');
    }
  }
  renderTabs();
}

function renderTabs() {
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = '';
  Object.keys(files).forEach(file => {
    const tab = document.createElement("div");
    tab.className = "tab" + (file === currentFile ? " active" : "");

    const name = document.createElement("span");
    name.textContent = file;
    name.onclick = () => openFile(file);

    const close = document.createElement("button");
    close.textContent = "✖";
    close.className = "close-btn";
    close.onclick = (e) => {
      e.stopPropagation();
      closeFile(file);
    };

    tab.appendChild(name);
    tab.appendChild(close);
    tabs.appendChild(tab);
  });
}

function createFile() {
  const lang = document.getElementById("lang").value;
  const ext = { js: "js", ts: "ts", py: "py", cpp: "cpp" }[lang];
  const name = `main.${ext}`;
  if (!files[name]) files[name] = `// ${lang.toUpperCase()} code...`;
  openFile(name);
}

function captureConsoleOutput(callback) {
  const originalLog = console.log;
  const originalError = console.error;
  const outputEl = document.getElementById("output");
  outputEl.textContent = '';

  console.log = (...args) => {
    outputEl.textContent += args.join(" ") + "\n";
    originalLog.apply(console, args);
  };

  console.error = (...args) => {
    outputEl.textContent += '❌ ' + args.join(" ") + "\n";
    originalError.apply(console, args);
  };

  try {
    callback();
  } catch (e) {
    console.error(e);
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

function runCode() {
  const code = editor.getValue();
  captureConsoleOutput(() => {
    if (currentFile.endsWith(".ts")) {
      const compiled = ts.transpile(code);
      eval(compiled);
    } else if (currentFile.endsWith(".js")) {
      eval(code);
    } else {
      console.log("This language is not executable in-browser.");
    }
  });
}

// Theme toggle
document.getElementById("themeSwitch").addEventListener("change", function () {
  const isDark = this.checked;
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  monaco.editor.setTheme(isDark ? "vs-dark" : "vs");
});

require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs" } });
require(["vs/editor/editor.main"], function () {
  editor = monaco.editor.create(document.getElementById("editor"), {
    value: "",
    language: "typescript",
    theme: "vs-dark",
    fontSize: 14,
    fontFamily: "Fira Code",
    automaticLayout: true,
    minimap: { enabled: false }
  });
  openFile("main.ts");
});
document.getElementById('downloadBtn').onclick = async function() {
  const filename = window.currentFile || 'main.txt';
  const code = window.editor ? window.editor.getValue() : '';
  // Try File System Access API
  if (window.showDirectoryPicker) {
    try {
      const dirHandle = await window.showDirectoryPicker();
      const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(code);
      await writable.close();
      alert('File downloaded to selected folder!');
      return;
    } catch (e) {
      alert('Download failed: ' + e.message);
    }
  }
  // Fallback: regular download
  const blob = new Blob([code], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};