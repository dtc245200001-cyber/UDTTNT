import React from 'react';

/**
 * Component render Markdown an toàn, không phụ thuộc thư viện ngoài,
 * tối ưu cho các câu trả lời lịch sử & tri thức bảo tàng.
 */
export const MarkdownMessage = ({ content }) => {
  if (!content) return null;

  // Tách dòng văn bản
  const lines = content.split('\n');
  const renderedElements = [];
  let currentList = [];
  let currentListType = null; // 'ul' hoặc 'ol'
  let inBlockquote = false;
  let blockquoteLines = [];

  const flushList = () => {
    if (currentList.length > 0) {
      if (currentListType === 'ol') {
        renderedElements.push(
          <ol key={`ol-${renderedElements.length}`} className="my-2 space-y-1.5 pl-4 list-decimal marker:text-museum-gold marker:font-bold">
            {currentList.map((item, idx) => (
              <li key={idx} className="text-xs sm:text-[13px] leading-relaxed pl-1">
                {renderInlineFormatting(item)}
              </li>
            ))}
          </ol>
        );
      } else {
        renderedElements.push(
          <ul key={`ul-${renderedElements.length}`} className="my-2 space-y-1.5 pl-2">
            {currentList.map((item, idx) => (
              <li key={idx} className="text-xs sm:text-[13px] leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-museum-gold mt-1.5 flex-shrink-0" />
                <span className="flex-1">{renderInlineFormatting(item)}</span>
              </li>
            ))}
          </ul>
        );
      }
      currentList = [];
      currentListType = null;
    }
  };

  const flushBlockquote = () => {
    if (blockquoteLines.length > 0) {
      renderedElements.push(
        <div
          key={`bq-${renderedElements.length}`}
          className="my-2.5 p-3 bg-museum-cream/60 border-l-3 border-museum-gold rounded-r-xl text-xs sm:text-[13px] italic text-museum-brown"
        >
          {blockquoteLines.map((line, idx) => (
            <p key={idx}>{renderInlineFormatting(line)}</p>
          ))}
        </div>
      );
      blockquoteLines = [];
      inBlockquote = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // 1. Dòng trống
    if (!trimmed) {
      flushList();
      flushBlockquote();
      return;
    }

    // 2. Blockquote (> ...)
    if (trimmed.startsWith('>')) {
      flushList();
      inBlockquote = true;
      blockquoteLines.push(trimmed.replace(/^>\s*/, ''));
      return;
    } else if (inBlockquote) {
      flushBlockquote();
    }

    // 3. Headers (###, ##, #)
    if (trimmed.startsWith('### ')) {
      flushList();
      renderedElements.push(
        <h4 key={`h4-${index}`} className="font-bold text-xs sm:text-sm text-museum-brown mt-3 mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-3 bg-museum-gold rounded-full" />
          {renderInlineFormatting(trimmed.substring(4))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      renderedElements.push(
        <h3 key={`h3-${index}`} className="font-extrabold text-sm sm:text-base text-museum-brown mt-3.5 mb-2 pb-1 border-b border-museum-gold/20">
          {renderInlineFormatting(trimmed.substring(3))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      renderedElements.push(
        <h2 key={`h2-${index}`} className="font-extrabold text-base sm:text-lg text-museum-brown mt-4 mb-2">
          {renderInlineFormatting(trimmed.substring(2))}
        </h2>
      );
      return;
    }

    // 4. Horizontal Rule (--- hoặc ***)
    if (trimmed === '---' || trimmed === '***') {
      flushList();
      renderedElements.push(<hr key={`hr-${index}`} className="my-3 border-museum-gold/30" />);
      return;
    }

    // 5. Unordered List (- hoặc * hoặc •)
    const ulMatch = trimmed.match(/^[-*•]\s+(.+)/);
    if (ulMatch) {
      if (currentListType && currentListType !== 'ul') flushList();
      currentListType = 'ul';
      currentList.push(ulMatch[1]);
      return;
    }

    // 6. Ordered List (1. 2. ...)
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (olMatch) {
      if (currentListType && currentListType !== 'ol') flushList();
      currentListType = 'ol';
      currentList.push(olMatch[2]);
      return;
    }

    // 7. Regular Paragraph
    flushList();
    renderedElements.push(
      <p key={`p-${index}`} className="text-xs sm:text-[13px] leading-relaxed my-1.5 text-gray-800">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList();
  flushBlockquote();

  return <div className="space-y-1 text-left">{renderedElements}</div>;
};

/**
 * Xử lý định dạng inline: in đậm (**), in nghiêng (*), mã inline (`)
 */
function renderInlineFormatting(text) {
  if (!text) return '';

  // Phân tích cú pháp cơ bản cho inline markdown
  // Tokenize theo các cú pháp
  const tokens = [];
  let remaining = text;
  let key = 0;

  // Regex nhận diện **bold**, *italic*, `code`
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;

    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={idx} className="font-bold text-museum-brown">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={idx} className="italic text-gray-700">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={idx} className="px-1.5 py-0.5 bg-museum-cream/80 text-museum-brown font-mono text-[11px] rounded">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
