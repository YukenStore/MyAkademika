import katex from 'katex';

/**
 * Utility untuk memformat dan merender rumus matematika (LaTeX / KaTeX)
 * serta format teks (markdown bold, breaks) menjadi HTML yang rapi dan benar.
 */
export function formatMath(text) {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') return String(text);

  // Bersihkan tag [H] atau [horizontal] jika masih ada, serta samakan format baris baru
  let result = text
    .replace(/\[h(?:orizontal)?\]\s*/gi, '')
    .replace(/\r\n/g, '\n');

  // Lindungi semua tag HTML valid (seperti <img ...>, <span ...>, <b>, <div>, <br />)
  // tanpa menyentuh tanda perbandingan matematika seperti "<" dan ">" (misal: $\frac{2}{5} < \frac{3}{5}$).
  const protectedHtmlTags = [];
  result = result.replace(
    /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^<>]*?)?\/?>/g,
    (tagMatch) => {
      const token = `__HTML_TAG_TOKEN_${protectedHtmlTags.length}__`;
      protectedHtmlTags.push(tagMatch);
      return token;
    }
  );

  // Lindungi seluruh output HTML/SVG KaTeX agar tidak rusak oleh konversi markdown (*, **) dan newline (\n -> <br />)
  // (KaTeX menggunakan newline di dalam atribut <path d="..."> pada simbol akar \sqrt, dll.)
  const protectedMathBlocks = [];
  const stashKatex = (formula, displayMode, fallback) => {
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode,
        throwOnError: false,
      });
      const token = `__KATEX_BLOCK_TOKEN_${protectedMathBlocks.length}__`;
      protectedMathBlocks.push(rendered);
      return token;
    } catch {
      return fallback;
    }
  };

  // 1. Render display math $$ ... $$
  result = result.replace(/\$\$([^$]+)\$\$/g, (match, formula) =>
    stashKatex(formula, true, match)
  );

  // 2. Render inline math $ ... $
  result = result.replace(/\$([^$\n]+)\$/g, (match, formula) =>
    stashKatex(formula, false, match)
  );

  // 3. Tangani kasus pecahan LaTeX mentah tanpa tanda dollar ($) misalnya \frac{1}{2} atau 3\frac{1}{2}
  result = result.replace(/(\d*\\frac\{[^{}]+\}\{[^{}]+\})/g, (match, formula) =>
    stashKatex(formula, false, match)
  );

  // 4. Konversi format markdown bold **teks** menjadi <strong>teks</strong>
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 5. Konversi format markdown italic *teks* menjadi <em>teks</em>
  result = result.replace(/(?<!\*)\*([^\s*][^*]*?)\*(?!\*)/g, '<em>$1</em>');

  // 6. Konversi newline \n menjadi <br /> agar baris baru sesuai dengan ketikan di Admin Panel
  result = result.replace(/\n/g, '<br />');

  // Kembalikan seluruh hasil render KaTeX & tag HTML (<img>, <span>, <div>, dll.) secara utuh
  result = result.replace(/__KATEX_BLOCK_TOKEN_(\d+)__/g, (_, idx) => {
    return protectedMathBlocks[Number(idx)] ?? '';
  });
  result = result.replace(/__HTML_TAG_TOKEN_(\d+)__/g, (_, idx) => {
    return protectedHtmlTags[Number(idx)] ?? '';
  });

  return result;
}

/**
 * Memeriksa apakah sebuah string konten/HTML (seperti stimulus / bacaan pengantar)
 * benar-benar memiliki teks terlihat atau media (gambar/svg/tabel), bukan sekadar tag kosong (<br>, <div><br></div>, spasi, &nbsp;).
 */
export function hasVisibleContent(value) {
  if (value === null || value === undefined) return false;
  const str = String(value);
  if (/<(?:img|svg|table|hr|video|audio|iframe)\b/i.test(str)) {
    return true;
  }
  const plain = str
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
  return plain.length > 0;
}

export default formatMath;
