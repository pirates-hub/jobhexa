// Example per-source override. Copy this file to ./<sourceId>.js and export
// discover(source) to take over document discovery for exactly one source.
// Only this file changes when that site's layout changes.
export async function discover(source) {
  // Example: return { ok: true, docs: [{ url, label }] };
  throw new Error(`override template for ${source.id} — copy and implement per site`);
}
