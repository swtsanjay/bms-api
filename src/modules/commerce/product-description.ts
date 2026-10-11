import sanitizeHtml from 'sanitize-html';

/** The same policy applies on save and whenever older stored HTML leaves the API. */
export function sanitizeProductDescriptionHtml(value: string | null | undefined): string | null {
    if (!value) return null;
    const cleaned = sanitizeHtml(value, {
        allowedTags: [
            'p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 's',
            'blockquote', 'h2', 'h3', 'h4', 'a', 'div', 'span'
        ],
        allowedAttributes: { a: ['href', 'title'] },
        allowedSchemes: ['http', 'https', 'mailto'],
        allowedSchemesAppliedToAttributes: ['href'],
        allowProtocolRelative: false,
        nonTextTags: [
            'script', 'style', 'textarea', 'option', 'xmp', 'noscript',
            'iframe', 'object', 'embed', 'svg', 'math', 'form', 'audio',
            'video', 'canvas', 'template'
        ],
        nestingLimit: 30
    });
    return cleaned || null;
}
