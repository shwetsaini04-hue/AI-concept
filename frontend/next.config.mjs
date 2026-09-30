/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The Python playground (Pyodide) and neural embeddings (transformers.js) are
  // loaded at runtime from a CDN, so nothing special is needed in the bundle.
};

export default nextConfig;
