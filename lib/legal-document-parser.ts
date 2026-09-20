import mammoth from "mammoth";
import sanitizeHtml from "sanitize-html";
import type { LegalBlock } from "@/lib/legal-documents";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function normalizeText(raw: string) {
  return raw.replace(/\r/g, "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function isHeading(line: string) {
  return /^(?:\d+(?:\.\d+)*\.?\s+)[A-Z]/.test(line) || (/^[A-Z][A-Z\s&,/'’-]{3,60}$/.test(line) && line.split(" ").length <= 9);
}

export function structureLegalText(raw: string, fallbackTitle: string) {
  const text = normalizeText(raw);
  const lines = text.split("\n").map(line => line.trim()).filter(line => line && !/^\d{1,3}$/.test(line));
  let title = fallbackTitle;
  if (lines[0] && lines[0].length < 80 && /terms|privacy|support/i.test(lines[0])) title = lines.shift()!;
  if (lines[0] && /^(last updated|effective date)\s*:/i.test(lines[0])) lines.shift();

  const blocks: LegalBlock[] = [];
  let paragraph: string[] = [];
  let listType: "bullets" | "numbered" | null = null;
  let listItems: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join(" ").replace(/\s+/g, " ") });
    paragraph = [];
  };
  const flushList = () => {
    if (listType && listItems.length) blocks.push({ type: listType, items: listItems });
    listType = null; listItems = [];
  };

  for (const line of lines) {
    const bullet = line.match(/^[•●▪◦*-]\s*(.+)$/);
    const numbered = line.match(/^\(?\d+[.)]\s+(.+)$/);
    if (isHeading(line)) {
      flushParagraph(); flushList();
      blocks.push({ type: "heading", text: line.replace(/\.$/, "") });
    } else if (bullet || numbered) {
      flushParagraph();
      const nextType = bullet ? "bullets" : "numbered";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((bullet?.[1] ?? numbered?.[1] ?? line).trim());
    } else if (listType && !/[.!?:;]$/.test(listItems.at(-1) ?? "")) {
      listItems[listItems.length - 1] += ` ${line}`;
    } else {
      flushList();
      paragraph.push(line);
      if (/[.!?][”’"]?$/.test(line)) flushParagraph();
    }
  }
  flushParagraph(); flushList();
  if (!blocks.length) throw new Error("No readable legal content was found in this file.");
  return { title, blocks };
}

export async function parseLegalFile(file: File, fallbackTitle: string) {
  if (!file.size || file.size > MAX_FILE_SIZE) throw new Error("Choose a file smaller than 10 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "docx") throw new Error("Upload a Microsoft Word .docx file.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const converted = await mammoth.convertToHtml({ buffer }, {
    styleMap: [
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Heading 1'] => h2:fresh",
      "p[style-name='Heading 2'] => h3:fresh",
      "p[style-name='Heading 3'] => h4:fresh",
    ],
  });
  let html = converted.value.trim();
  if (!html) throw new Error("This Word document does not contain readable text.");

  let title = fallbackTitle;
  const titleMatch = html.match(/^<(?:h1|p)><strong>([^<]+)<\/strong><\/(?:h1|p)>/i) ?? html.match(/^<h1>([^<]+)<\/h1>/i);
  if (titleMatch && /terms|privacy|support/i.test(titleMatch[1])) {
    title = sanitizeHtml(titleMatch[1], { allowedTags: [], allowedAttributes: {} });
    html = html.slice(titleMatch[0].length);
  }
  html = html.replace(/^<p><em>\s*(?:Last Updated|Effective Date)\s*:[\s\S]*?<\/em><\/p>/i, "");

  // Word commonly represents legal section headings as isolated numbered-list
  // items. Turn only strong, single-item lists into numbered headings while
  // leaving actual numbered provisions and nested lists intact.
  let sectionNumber = 0;
  html = html.replace(/<ol><li><strong>([^<]+)<\/strong><\/li><\/ol>/gi, (_match, heading: string) => {
    sectionNumber += 1;
    return `<h2><span>${sectionNumber}.</span> ${heading}</h2>`;
  });

  const safeHtml = sanitizeHtml(html, {
    allowedTags: ["p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "u", "a", "br", "span"],
    allowedAttributes: { a: ["href", "title"] },
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
  });
  return { title, blocks: [{ type: "document" as const, html: safeHtml }] };
}
