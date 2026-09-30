/**
 * Real Python in the browser via Pyodide (WebAssembly CPython). Loaded lazily
 * from the jsDelivr CDN the first time a learner presses "Run". Supports
 * numpy, pandas, scikit-learn, scipy and matplotlib.
 */
const PYODIDE_VERSION = "0.28.3";
export const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

/* eslint-disable @typescript-eslint/no-explicit-any */
let pyPromise: Promise<any> | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export function loadPython(onStatus?: (s: string) => void): Promise<any> {
  if (!pyPromise) {
    pyPromise = (async () => {
      onStatus?.("Downloading Python runtime (~10 MB, first time only)…");
      await loadScript(`${PYODIDE_URL}pyodide.js`);
      const py = await (window as any).loadPyodide({ indexURL: PYODIDE_URL });
      onStatus?.("Python ready.");
      return py;
    })().catch((e) => {
      pyPromise = null;
      throw e;
    });
  }
  return pyPromise;
}

export interface PyResult {
  stdout: string;
  stderr: string;
  images: string[];
  error?: string;
  ms: number;
}

const POSTLUDE = `
import sys as _sys, json as _json
_imgs = []
if 'matplotlib.pyplot' in _sys.modules:
    import io as _io, base64 as _b64
    import matplotlib.pyplot as _plt
    for _n in _plt.get_fignums():
        _buf = _io.BytesIO()
        _plt.figure(_n).savefig(_buf, format='png', dpi=110, bbox_inches='tight')
        _imgs.append(_b64.b64encode(_buf.getvalue()).decode())
    _plt.close('all')
_json.dumps(_imgs)
`;

export async function runPython(code: string, onStatus?: (s: string) => void): Promise<PyResult> {
  const t0 = performance.now();
  const py = await loadPython(onStatus);
  let stdout = "";
  let stderr = "";
  py.setStdout({ batched: (s: string) => (stdout += s + "\n") });
  py.setStderr({ batched: (s: string) => (stderr += s + "\n") });
  try {
    onStatus?.("Loading packages used by your code…");
    await py.loadPackagesFromImports(code, { messageCallback: (m: string) => onStatus?.(m) });
    if (code.includes("matplotlib")) {
      await py.runPythonAsync("import matplotlib\nmatplotlib.use('AGG')");
    }
    onStatus?.("Running…");
    await py.runPythonAsync(code);
    const imgsJson = await py.runPythonAsync(POSTLUDE);
    const images = JSON.parse(String(imgsJson)) as string[];
    onStatus?.("");
    return { stdout, stderr, images, ms: performance.now() - t0 };
  } catch (e) {
    onStatus?.("");
    return { stdout, stderr, images: [], error: String((e as Error).message ?? e), ms: performance.now() - t0 };
  }
}
