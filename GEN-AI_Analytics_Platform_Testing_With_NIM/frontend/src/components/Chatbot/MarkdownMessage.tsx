import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface MarkdownMessageProps {
  content: string;
  isUser?: boolean;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, isUser }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (isUser) {
    return <p className="whitespace-pre-wrap leading-relaxed text-sm font-medium">{content}</p>;
  }

  // Parse inline text (bold, italic, code, links)
  const renderInline = (text: string): React.ReactNode => {
    // Split by markdown formatting
    // Tokens: `code`, **bold**, *italic*, [link](url)
    const elements: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // 1. Inline code: `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        elements.push(
          <code
            key={keyIdx++}
            className="font-mono text-[11px] bg-indigo-50/80 text-indigo-700 font-semibold px-1.5 py-0.5 rounded border border-indigo-100/80"
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // 2. Bold: **bold** or __bold__
      const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
      if (boldMatch) {
        elements.push(
          <strong
            key={keyIdx++}
            className="font-semibold text-slate-900 bg-slate-100/90 px-1 py-0.5 rounded text-[92%] border border-slate-200/60"
          >
            {renderInline(boldMatch[2])}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // 3. Italic: *italic* or _italic_
      const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
      if (italicMatch) {
        elements.push(
          <em key={keyIdx++} className="italic text-slate-700">
            {renderInline(italicMatch[2])}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // 4. Links: [text](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        elements.push(
          <a
            key={keyIdx++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 hover:text-sky-800 underline font-medium"
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Plain text up to next potential markdown character
      const nextSpecial = remaining.search(/[`*_\[]/);
      if (nextSpecial === -1) {
        elements.push(remaining);
        break;
      } else if (nextSpecial === 0) {
        elements.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        elements.push(remaining.slice(0, nextSpecial));
        remaining = remaining.slice(nextSpecial);
      }
    }

    return elements.length === 1 ? elements[0] : <>{elements}</>;
  };

  // Split lines into structured blocks (Headings, Tables, Lists, Code Blocks, Paragraphs)
  const lines = content.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Code Blocks (```lang ... ```)
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || 'code';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      const fullCode = codeLines.join('\n');
      const blockId = `code-block-${i}-${Math.random().toString(36).substring(2, 6)}`;

      blocks.push(
        <div
          key={`code-${i}`}
          className="my-3 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 text-slate-100 shadow-md"
        >
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950 border-b border-slate-800 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
              <Terminal className="w-3.5 h-3.5" />
              <span>{lang}</span>
            </div>
            <button
              onClick={() => handleCopy(fullCode, blockId)}
              className="flex items-center gap-1 hover:text-white transition-colors text-[11px] text-slate-400 hover:bg-slate-800 px-2 py-0.5 rounded-lg"
              type="button"
            >
              {copiedCode === blockId ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3.5 text-xs font-mono overflow-x-auto text-slate-200 leading-relaxed">
            <code>{fullCode}</code>
          </pre>
        </div>
      );
      continue;
    }

    // 2. Markdown Tables (| Col 1 | Col 2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith('|') &&
        lines[i].trim().endsWith('|')
      ) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0]
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        const hasSep = tableLines[1].includes('---');
        const dataRows = (hasSep ? tableLines.slice(2) : tableLines.slice(1)).map((r) =>
          r
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim())
        );

        blocks.push(
          <div
            key={`table-${i}`}
            className="my-2.5 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/90 text-slate-800 uppercase tracking-wider font-bold text-[10px]">
                    {headerRow.map((cell, cIdx) => (
                      <th key={cIdx} className="px-2.5 py-1.5 font-bold text-slate-800">
                        {renderInline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dataRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-indigo-50/30 transition-colors odd:bg-white even:bg-slate-50/40"
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-2.5 py-1.5 text-slate-700 leading-normal font-normal"
                        >
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
        continue;
      }
    }

    // 3. Headings (#, ##, ###, ####)
    if (trimmed.startsWith('#')) {
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];

        if (level === 1) {
          blocks.push(
            <h1
              key={`h1-${i}`}
              className="text-sm font-bold text-slate-900 mt-2.5 mb-1 pb-1 border-b border-slate-200/80 flex items-center gap-1.5"
            >
              <span className="w-1.5 h-3.5 rounded-full bg-indigo-600 inline-block"></span>
              <span>{renderInline(text)}</span>
            </h1>
          );
        } else if (level === 2) {
          blocks.push(
            <h2
              key={`h2-${i}`}
              className="text-xs font-bold text-slate-900 mt-2 mb-1 flex items-center gap-1.5"
            >
              <span className="w-1 h-3 rounded-full bg-sky-500 inline-block"></span>
              <span>{renderInline(text)}</span>
            </h2>
          );
        } else if (level === 3) {
          blocks.push(
            <h3
              key={`h3-${i}`}
              className="text-xs font-semibold text-slate-800 mt-1.5 mb-0.5"
            >
              <span>{renderInline(text)}</span>
            </h3>
          );
        } else {
          blocks.push(
            <h4
              key={`h4-${i}`}
              className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mt-1.5 mb-0.5"
            >
              {renderInline(text)}
            </h4>
          );
        }
        i++;
        continue;
      }
    }

    // 4. Blockquotes (> quote)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 border-indigo-500 bg-indigo-50/50 pl-2.5 pr-2 py-1 rounded-r-lg my-1.5 text-xs text-slate-700 italic"
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx} className="mb-0.5 last:mb-0">
              {renderInline(ql)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 5. Bullet Lists (- item or * item)
    if (/^[-*•]\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="list-disc pl-4 space-y-0.5 my-1 text-xs text-slate-700">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed pl-0.5">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 6. Numbered Lists (1. item)
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="list-decimal pl-4 space-y-0.5 my-1 text-xs text-slate-700">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed pl-0.5">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 7. Horizontal Rule (--- or ***)
    if (/^[-*_]{3,}$/.test(trimmed)) {
      blocks.push(<hr key={`hr-${i}`} className="my-2 border-slate-200" />);
      i++;
      continue;
    }

    // 8. Regular Paragraph
    blocks.push(
      <p key={`p-${i}`} className="text-xs text-slate-700 leading-relaxed mb-1.5 last:mb-0">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="prose-chat space-y-0.5">{blocks}</div>;
};
