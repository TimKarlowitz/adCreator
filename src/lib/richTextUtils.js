/**
 * Shared utilities for rendering rich-text content onto a Canvas 2D context.
 *
 * A "richContent" value is an array of Segment objects:
 *   { text: string, color?: string, bold?: boolean, italic?: boolean }
 *
 * \n characters inside `text` are treated as line breaks.
 */

/**
 * Split a flat segment array into lines.
 * Each line is an array of segments (with \n stripped from segment text).
 */
export function buildRichLines(richContent) {
  const lines = [[]];
  for (const seg of richContent) {
    const parts = seg.text.split('\n');
    // The first part belongs to the current (last) line
    if (parts[0] !== '') {
      lines[lines.length - 1].push({ ...seg, text: parts[0] });
    }
    // Each subsequent part starts a new line
    for (let i = 1; i < parts.length; i++) {
      lines.push(parts[i] !== '' ? [{ ...seg, text: parts[i] }] : []);
    }
  }
  return lines;
}

/**
 * Draw richContent (or plain `content` string) onto a Canvas 2D context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ content?: string, richContent?: Segment[] }} textData
 * @param {{
 *   fontFamily: string,
 *   fontSize: number,      // already scaled to canvas pixels
 *   color: string,
 *   bold: boolean,
 *   align: 'left'|'center'|'right',
 *   verticalAlign: 'top'|'center'|'bottom',
 *   lineHeight: number,    // line-height multiplier (e.g. 1.3). Defaults to 1.3.
 * }} defaults
 * @param {number} canvasWidth   – width in canvas pixels
 * @param {number} padX          – horizontal padding (canvas pixels)
 * @param {number} padY          – vertical padding (canvas pixels)
 * @param {number} canvasHeight  – height in canvas pixels (required for vertical alignment)
 */
export function drawTextContent(ctx, textData, defaults, canvasWidth, padX = 0, padY = 0, canvasHeight = 0) {
  const {
    fontFamily = 'Geist',
    fontSize,
    color = '#ffffff',
    bold = false,
    align = 'left',
    verticalAlign = 'top',
    lineHeight = 1.3,
  } = defaults;

  const { content = '', richContent } = textData;
  const lineH = fontSize * lineHeight;

  // Compute starting Y for vertical alignment
  const numLines = richContent?.length
    ? buildRichLines(richContent).length
    : content.split('\n').length;
  const totalTextH = numLines * lineH;

  let startY = padY;
  if (canvasHeight > 0 && verticalAlign !== 'top') {
    if (verticalAlign === 'center') {
      startY = (canvasHeight - totalTextH) / 2;
    } else if (verticalAlign === 'bottom') {
      startY = canvasHeight - padY - totalTextH;
    }
  }

  ctx.save();
  ctx.textBaseline = 'top';

  if (!richContent?.length) {
    // ── Plain text ────────────────────────────────────────────────────────
    ctx.font = `${bold ? 'bold' : 'normal'} ${fontSize}px "${fontFamily}"`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    const xPos =
      align === 'center' ? canvasWidth / 2
      : align === 'right' ? canvasWidth - padX
      : padX;
    content.split('\n').forEach((line, i) => {
      ctx.fillText(line, xPos, startY + i * lineH);
    });
  } else {
    // ── Rich content ──────────────────────────────────────────────────────
    const lines = buildRichLines(richContent);

    lines.forEach((lineSegs, lineIdx) => {
      const y = startY + lineIdx * lineH;

      // Measure total line width for alignment
      let lineWidth = 0;
      lineSegs.forEach((seg) => {
        const isBold = seg.bold !== undefined ? seg.bold : bold;
        ctx.font = `${isBold ? 'bold' : 'normal'} ${fontSize}px "${fontFamily}"`;
        lineWidth += ctx.measureText(seg.text).width;
      });

      let x;
      if (align === 'center') x = (canvasWidth - lineWidth) / 2;
      else if (align === 'right') x = canvasWidth - padX - lineWidth;
      else x = padX;

      lineSegs.forEach((seg) => {
        const isBold = seg.bold !== undefined ? seg.bold : bold;
        ctx.font = `${isBold ? 'bold' : 'normal'} ${fontSize}px "${fontFamily}"`;
        ctx.fillStyle = seg.color ?? color;
        ctx.fillText(seg.text, x, y);
        x += ctx.measureText(seg.text).width;
      });
    });
  }

  ctx.restore();
}

/**
 * Derive a plain-text string from richContent (for display labels etc.)
 */
export function richContentToPlainText(richContent) {
  if (!richContent?.length) return '';
  return richContent.map((s) => s.text).join('');
}
