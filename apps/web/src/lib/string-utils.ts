/**
 * Chuẩn hóa chuỗi và giải mã HTML entities cho nội dung phim
 */

const NAMED_ENTITIES: Record<string, string> = {
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&#039;': "'",
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
  '&hellip;': '…',
  '&ndash;': '–',
  '&mdash;': '—',
  '&ldquo;': '"',
  '&rdquo;': '"',
  '&lsquo;': "'",
  '&rsquo;': "'",
  '&laquo;': '«',
  '&raquo;': '»',
  '&trade;': '™',
  '&copy;': '©',
  '&reg;': '®',
};

/**
 * Giải mã các HTML entities (cả dạng tên &quot;, số &#39;, và hex &#x27;)
 * Hỗ trợ 2 pass để xử lý triệt để trường hợp double-encoded như &amp;quot;
 */
export function decodeHtmlEntities(text?: string | null): string {
  if (!text) return '';

  let decoded = String(text);

  for (let i = 0; i < 2; i++) {
    const prev = decoded;
    decoded = decoded
      .replace(
        /&(quot|apos|#39|#039|amp|lt|gt|nbsp|hellip|ndash|mdash|ldquo|rdquo|lsquo|rsquo|laquo|raquo|trade|copy|reg);/gi,
        (match) => NAMED_ENTITIES[match.toLowerCase()] ?? match
      )
      .replace(/&#(\d+);/g, (_, dec) => {
        try {
          return String.fromCharCode(Number(dec));
        } catch {
          return _;
        }
      })
      .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => {
        try {
          return String.fromCharCode(parseInt(hex, 16));
        } catch {
          return _;
        }
      });

    if (prev === decoded) break;
  }

  return decoded;
}

/**
 * Làm sạch mô tả phim:
 * - Chuyển đổi thẻ <p>, <br>, <div> thành dấu xuống dòng hợp lý
 * - Bỏ toàn bộ thẻ HTML còn lại
 * - Giải mã hoàn toàn HTML entities
 * - Loại bỏ các đoạn rác subtitle chứa timeline (00:01:23,456 --> 00:01:25,789)
 * - Chuẩn hóa các đoạn văn
 */
export function cleanMovieDescription(content?: string | null): string {
  if (!content) return '';

  // Phát hiện và loại bỏ rác file phụ đề (SRT/VTT) lẫn vào mô tả từ một số nguồn lậu
  if (content.includes('-->') && content.length > 500) {
    const lines = content.split('\n');
    const filteredLines = lines.filter(
      (line) => !line.includes('-->') && !/^\d+$/.test(line.trim())
    );
    content = filteredLines.join('\n');
  }

  // Chuyển ngắt dòng HTML sang ký tự xuống dòng
  let text = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n')
    .replace(/<[^>]*>/g, '');

  // Giải mã HTML entities
  text = decodeHtmlEntities(text);

  // Chuẩn hóa: tách thành các đoạn văn bởi 2 hoặc nhiều dấu xuống dòng liên tiếp
  const paragraphs = text
    .split(/\r?\n\s*\r?\n+/)
    .map((p) =>
      p
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n')
    )
    .filter(Boolean);

  return paragraphs.join('\n\n');
}
