import { extractJobFromPdf, summarizePdf } from '../services/ai.service.js';

export const uploadAndExtract = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'PDF file required' });
    let pdfParse = (await import('pdf-parse')).default;
    // Handle both ESM and CJS exports
    if (typeof pdfParse !== 'function' && pdfParse.default) pdfParse = pdfParse.default;
    const data = await pdfParse(req.file.buffer);
    const text = data.text;
    if (!text || text.trim().length < 20) {
      return res.status(400).json({ success: false, message: 'Could not extract text from PDF' });
    }
    const [extraction, summary] = await Promise.all([
      extractJobFromPdf(text),
      summarizePdf(text),
    ]);
    res.json({ success: true, data: { text: text.substring(0, 5000), extraction, summary, pages: data.numpages } });
  } catch (e) {
    console.error('PDF error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
};
