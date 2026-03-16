/**
 * Note PDF Export Service
 * Converts NoteBlocks → styled HTML → PDF using expo-print & expo-sharing.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { LocalNote, NoteBlock } from './localNotesStorage';

// ── Helpers ──────────────────────────────────────────────────────────────────

const escapeHtml = (text: string): string =>
    text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

// ── Block → HTML conversion ─────────────────────────────────────────────────

const blocksToHtml = (blocks: NoteBlock[]): string => {
    let html = '';
    let inList: 'bullet' | 'numbered' | null = null;

    for (const block of blocks) {
        // Close previous list if type changed
        if (inList && block.type !== inList) {
            html += inList === 'bullet' ? '</ul>' : '</ol>';
            inList = null;
        }

        const content = escapeHtml(block.content || '');

        switch (block.type) {
            case 'h1':
                html += `<h1>${content}</h1>`;
                break;
            case 'h2':
                html += `<h2>${content}</h2>`;
                break;
            case 'h3':
                html += `<h3>${content}</h3>`;
                break;
            case 'bullet':
                if (!inList) { html += '<ul>'; inList = 'bullet'; }
                html += `<li>${content}</li>`;
                break;
            case 'numbered':
                if (!inList) { html += '<ol>'; inList = 'numbered'; }
                html += `<li>${content}</li>`;
                break;
            case 'quote':
                html += `<blockquote>${content}</blockquote>`;
                break;
            case 'callout':
                html += `<div class="callout"><span class="callout-icon">!</span><span>${content}</span></div>`;
                break;
            case 'code':
                html += `<pre><code>${content}</code></pre>`;
                break;
            case 'divider':
                html += '<hr />';
                break;
            case 'link':
                const href = block.metadata?.url ? escapeHtml(block.metadata.url) : '#';
                html += `<p><a href="${href}">${content || href}</a></p>`;
                break;
            case 'image':
                const src = block.metadata?.url || block.content;
                if (src) {
                    html += `<div class="image-block"><img src="${escapeHtml(src)}" alt="Note image" /></div>`;
                }
                break;
            case 'toggle':
                html += `<details><summary>${content}</summary>`;
                if (block.metadata?.children) {
                    html += blocksToHtml(block.metadata.children);
                }
                html += '</details>';
                break;
            default:
                if (content) html += `<p>${content}</p>`;
                break;
        }
    }

    // Close any trailing open list
    if (inList) html += inList === 'bullet' ? '</ul>' : '</ol>';

    return html;
};

// ── Source labels ────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
    manual: { label: 'My Note', color: '#2A7DEB' },
    scraped: { label: 'Web Article', color: '#06B6D4' },
    ncert: { label: 'NCERT', color: '#10B981' },
    book: { label: 'Standard Book', color: '#2A7DEB' },
    current_affairs: { label: 'Current Affairs', color: '#F59E0B' },
    report: { label: 'Report', color: '#EF4444' },
};

// ── HTML generation ─────────────────────────────────────────────────────────

export const generateNoteHtml = (note: LocalNote): string => {
    const source = SOURCE_LABELS[note.sourceType || 'manual'] || SOURCE_LABELS.manual;

    // Tags HTML
    const tagsHtml = note.tags.length > 0
        ? `<div class="tags">${note.tags.map(t =>
            `<span class="tag" style="background:${t.color}20;color:${t.color}">#${escapeHtml(t.name)}</span>`
        ).join('')}</div>`
        : '';

    // Summary HTML
    const summaryHtml = note.summary
        ? `<div class="summary-card">
               <div class="summary-label">AI Summary</div>
               <p>${escapeHtml(note.summary)}</p>
           </div>`
        : '';

    // Content HTML
    const contentHtml = note.blocks && note.blocks.length > 0
        ? blocksToHtml(note.blocks)
        : note.content.split('\n\n').map(p => `<p>${escapeHtml(p)}</p>`).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${escapeHtml(note.title)} - UPSC Notes</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
    max-width: 780px;
    margin: 0 auto;
    padding: 36px;
    color: #334155;
    line-height: 1.7;
    font-size: 15px;
}

/* ── Header ─────────────────────── */
.header {
    background: linear-gradient(135deg, #1A5DB8, #2A7DEB, #2A7DEB);
    color: #fff;
    padding: 28px 32px;
    border-radius: 14px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
}
.header::before {
    content: '';
    position: absolute;
    width: 160px; height: 160px;
    border-radius: 50%;
    background: rgba(255,255,255,0.06);
    top: -40px; right: -30px;
}
.header .source {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    background: rgba(255,255,255,0.18);
    margin-bottom: 10px;
    letter-spacing: 0.3px;
}
.header h1 {
    font-size: 24px;
    line-height: 1.3;
    font-weight: 700;
    margin: 0;
    color: #fff;
}
.header .meta {
    font-size: 12px;
    opacity: 0.80;
    margin-top: 10px;
}

/* ── Tags ───────────────────────── */
.tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 20px;
}
.tag {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 14px;
    font-size: 11px;
    font-weight: 600;
}

/* ── Summary ────────────────────── */
.summary-card {
    background: #F5F1EB;
    border: 1px solid #E9D5FF;
    border-radius: 12px;
    padding: 18px 20px;
    margin-bottom: 22px;
}
.summary-label {
    color: #4AB09D;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.summary-card p {
    margin: 0;
    color: #4B5563;
    line-height: 1.7;
}

/* ── Content ────────────────────── */
.content { margin-top: 8px; }
.content h1 { font-size: 22px; color: #0F172A; margin: 22px 0 10px; font-weight: 700; }
.content h2 { font-size: 19px; color: #1E293B; margin: 18px 0 8px; font-weight: 600; }
.content h3 { font-size: 16px; color: #374151; margin: 14px 0 6px; font-weight: 600; }
.content p  { margin: 8px 0; line-height: 1.8; }
.content ul, .content ol { margin: 10px 0; padding-left: 22px; }
.content li { margin: 5px 0; line-height: 1.7; }
.content blockquote {
    border-left: 4px solid #2A7DEB;
    padding: 10px 16px;
    margin: 14px 0;
    color: #64748B;
    font-style: italic;
    background: #F8FAFC;
    border-radius: 0 8px 8px 0;
}
.content .callout {
    background: #FEF3C7;
    border-radius: 10px;
    padding: 12px 14px;
    margin: 14px 0;
    display: flex;
    gap: 8px;
    align-items: flex-start;
}
.callout-icon {
    background: #F59E0B;
    color: #fff;
    width: 20px; height: 20px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
}
.content pre {
    background: #1E293B;
    color: #E2E8F0;
    padding: 14px;
    border-radius: 8px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    overflow-x: auto;
    line-height: 1.5;
    margin: 14px 0;
    white-space: pre-wrap;
}
.content hr {
    border: none;
    border-top: 2px solid #E2E8F0;
    margin: 22px 0;
}
.content a { color: #2A7DEB; text-decoration: underline; }
.content details {
    margin: 10px 0;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    padding: 10px 14px;
}
.content details summary {
    font-weight: 600;
    cursor: pointer;
    color: #374151;
}
.image-block { margin: 14px 0; text-align: center; }
.image-block img { max-width: 100%; border-radius: 8px; }

/* ── Footer ─────────────────────── */
.footer {
    text-align: center;
    color: #94A3B8;
    font-size: 10px;
    margin-top: 36px;
    padding-top: 14px;
    border-top: 1px solid #E2E8F0;
}

/* ── Print ──────────────────────── */
@media print {
    body { padding: 20px; }
    .header, .summary-card, .callout {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
    }
    h1, h2, h3, blockquote, .callout { page-break-inside: avoid; }
}
</style>
</head>
<body>

<!-- Header -->
<div class="header">
    <span class="source">${escapeHtml(source.label)}</span>
    <h1>${escapeHtml(note.title || 'Untitled')}</h1>
    <div class="meta">
        Created ${formatDate(note.createdAt)}${note.updatedAt !== note.createdAt
            ? ` &middot; Edited ${formatDate(note.updatedAt)}`
            : ''}
    </div>
</div>

<!-- Tags -->
${tagsHtml}

<!-- Summary -->
${summaryHtml}

<!-- Content -->
<div class="content">
${contentHtml}
</div>

<!-- Footer -->
<div class="footer">
    Generated from UPSC PrepAssist &middot; ${formatDate(new Date().toISOString())}
</div>

</body>
</html>`;
};

// ── PDF Export ────────────────────────────────────────────────────────────────

/**
 * Generate PDF and open native share sheet (save to files, WhatsApp, email, etc.)
 */
export const shareNotePdf = async (note: LocalNote): Promise<void> => {
    const html = generateNoteHtml(note);
    const { uri } = await Print.printToFileAsync({ html });

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Share "${note.title}" as PDF`,
            UTI: 'com.adobe.pdf',
        });
    } else {
        // Fallback: system print dialog (user can save as PDF from there)
        await Print.printAsync({ html });
    }
};

/**
 * Open system print preview (user can save as PDF or print)
 */
export const previewNotePdf = async (note: LocalNote): Promise<void> => {
    const html = generateNoteHtml(note);
    await Print.printAsync({ html });
};
