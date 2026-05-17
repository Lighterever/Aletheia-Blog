/**
 * Markdown preprocessor — runs before marked.parse() to add support for:
 *   ==highlight==  → <mark>
 *   ~subscript~    → <sub>  (avoids ~~strikethrough~~ conflict)
 *   ^superscript^  → <sup>  (avoids [^footnote] conflict)
 *   Heading\n===   → ## Heading  (Setext h2)
 *   $$LaTeX$$      → preserved from <p> wrapping
 */
(function() {
    'use strict';

    var latexBlocks = [];

    function extractLatex(text) {
        latexBlocks = [];
        var idx = 0;
        return text.replace(/\$\$([\s\S]*?)\$\$/g, function(_, body) {
            var ph = '\u0000LTX' + idx + '\u0000';
            latexBlocks.push(body.trim());
            idx++;
            return '\n\n' + ph + '\n\n';
        });
    }

    function restoreLatex(html) {
        for (var i = 0; i < latexBlocks.length; i++) {
            var body = latexBlocks[i];
            var ph = '\u0000LTX' + i + '\u0000';
            html = html.split('<p>' + ph + '</p>').join(
                '<div class="katex-block-wrapper">$$' + body + '$$</div>'
            );
            html = html.split(ph).join(
                '<div class="katex-block-wrapper">$$' + body + '$$</div>'
            );
        }
        latexBlocks = [];
        return html;
    }

    function preprocess(text) {
        text = extractLatex(text);

        text = text.replace(/(?<!\w)==([^=\n]+?)==(?!\w)/g, '<mark>$1</mark>');

        text = text.replace(
            /(?<!~)~([^~\s][^~]*?)~(?!~)/g,
            '<sub>$1</sub>'
        );

        text = text.replace(
            /(?<![\^\[\[])\^([^\^\s][^\^]*?)\^(?!\^)/g,
            '<sup>$1</sup>'
        );

        text = text.replace(/^([^\n]+)\n={3,}$/gm, function(_, h) {
            return '## ' + h.trim();
        });

        return text;
    }

    var api = { preprocess: preprocess, restoreLatex: restoreLatex };

    if (typeof window !== 'undefined') window.mdPreprocess = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
