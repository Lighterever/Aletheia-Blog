/**
 * Markdown preprocessor — runs before marked.parse() to add support for:
 *   ==highlight==  → <mark>
 *   ~subscript~    → <sub>  (avoids ~~strikethrough~~ conflict)
 *   ^superscript^  → <sup>  (avoids [^footnote] conflict)
 *   [^N] / [^N]:  → footnotes (preserves user numbering)
 *   Heading\n===   → ## Heading  (Setext h2)
 *   $$LaTeX$$      → preserved from <p> wrapping
 */
(function() {
    'use strict';

    var latexBlocks = [];
    var footnoteDefs = {};

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

    function extractCodeSpans(text) {
        var spans = [];
        text = text.replace(/`([^`]+)`/g, function(match) {
            spans.push(match);
            return '\u0000CS' + (spans.length - 1) + '\u0000';
        });
        return { text: text, spans: spans };
    }

    function restoreCodeSpans(text, spans) {
        for (var i = 0; i < spans.length; i++) {
            text = text.replace('\u0000CS' + i + '\u0000', spans[i]);
        }
        return text;
    }

    function processFootnotes(text) {
        footnoteDefs = {};

        // Protect fenced code blocks and inline code from footnote processing
        var fencedBlocks = [];
        text = text.replace(/(```|~~~)([\s\S]*?)\1/g, function(match) {
            fencedBlocks.push(match);
            return '\u0000FC' + (fencedBlocks.length - 1) + '\u0000';
        });

        var cs = extractCodeSpans(text);
        text = cs.text;

        // Collect footnote definitions [^N]: content (until next def or end)
        text = text.replace(/^\[\^(\d+)\]:\s+([\s\S]*?)(?=\n\[\^\d+\]:\s|$)/gm, function(match, num, content) {
            footnoteDefs[num] = content.trim();
            return '';
        });

        // Replace [^N] references (not inside code spans, already protected)
        for (var n in footnoteDefs) {
            var refRe = new RegExp('\\[\\^' + n + '\\]', 'g');
            text = text.replace(refRe, '\u0000FN' + n + '\u0000');
        }

        // Restore code spans
        text = restoreCodeSpans(text, cs.spans);

        // Restore fenced blocks
        for (var f = 0; f < fencedBlocks.length; f++) {
            text = text.replace('\u0000FC' + f + '\u0000', fencedBlocks[f]);
        }

        return text;
    }

    function restoreFootnotes(html) {
        var keys = Object.keys(footnoteDefs);
        if (!keys.length) { footnoteDefs = {}; return html; }
        keys.sort(function(a, b) { return parseInt(a) - parseInt(b); });

        // Replace footnote ref placeholders with sup links
        for (var k = 0; k < keys.length; k++) {
            var n = keys[k];
            var ph = '\u0000FN' + n + '\u0000';
            var ref = '<sup id="fnref-' + n + '"><a href="#fn-' + n + '" data-footnote-ref aria-describedby="footnote-label">' + n + '</a></sup>';
            html = html.split(ph).join(ref);
        }

        // Build footnotes section
        var section = '\n<section class="footnotes" data-footnotes>\n<h2 id="footnote-label" class="sr-only">Footnotes</h2>\n<ol>\n';
        for (var j = 0; j < keys.length; j++) {
            var nn = keys[j];
            section += '<li id="fn-' + nn + '">' + footnoteDefs[nn] + ' <a href="#fnref-' + nn + '" data-footnote-backref aria-label="Back to reference ' + nn + '">↩</a></li>\n';
        }
        section += '</ol>\n</section>';
        html += section;
        footnoteDefs = {};
        return html;
    }

    function preprocess(text) {
        text = extractLatex(text);

        text = processFootnotes(text);

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

    var api = { preprocess: preprocess, restoreLatex: restoreLatex, restoreFootnotes: restoreFootnotes };

    if (typeof window !== 'undefined') window.mdPreprocess = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
