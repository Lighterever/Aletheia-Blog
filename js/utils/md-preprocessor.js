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
        html = html.replace(/\u200B/g, '');
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

        // Collect footnote definitions [^N]: content with line-by-line parser
        // A footnote definition starts with [^N]: and continues until the next
        // [^N]: line (not indented) or end of text. Content lines after the
        // first can be indented (4+ spaces / tab) or blank (paragraph separator).
        var lines = text.split('\n');
        var outLines = [];
        var inDef = null;   // current footnote number or null
        var defContent = [];
        function flushDef() {
            if (inDef !== null) {
                footnoteDefs[inDef] = defContent.join('\n').trim();
                inDef = null;
                defContent = [];
            }
        }
        for (var li = 0; li < lines.length; li++) {
            var line = lines[li];
            var dm = line.match(/^\[\^(\d+)\]:\s?(.*)/);
            if (dm && inDef === null) {
                // Start a new definition
                inDef = dm[1];
                defContent.push(dm[2]);
            } else if (dm && inDef !== null) {
                // New definition while already in one: flush then start next
                flushDef();
                inDef = dm[1];
                defContent.push(dm[2]);
            } else if (inDef !== null) {
                // Continuation line
                var trimmed = line.trimRight();
                // Blank line: keep as paragraph separator
                // Non-blank: strip up to 4 leading spaces (continuation indent)
                if (trimmed === '') {
                    defContent.push('');
                } else {
                    var stripped = line.replace(/^ {1,4}/, '');
                    defContent.push(stripped);
                }
            } else {
                outLines.push(line);
            }
        }
        flushDef();

        text = outLines.join('\n');

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

        // Access marked: browser (window.marked) or Node (markForFn)
        var mk = (typeof window !== 'undefined' && window.marked) ? window.marked : restoreFootnotes._marked;
        function parseMd(text) {
            if (!mk) return text;
            try { return mk.parse(text); } catch(e) { return text; }
        }

        // Replace footnote ref placeholders with sup links
        for (var k = 0; k < keys.length; k++) {
            var n = keys[k];
            var ph = '\u0000FN' + n + '\u0000';
            var ref = '<sup id="fnref-' + n + '"><a href="#fn-' + n + '" data-footnote-ref aria-describedby="footnote-label">' + n + '</a></sup>';
            html = html.split(ph).join(ref);
        }

        // Build footnotes section: parse footnote content as markdown
        var section = '\n<section class="footnotes" data-footnotes>\n<h2 id="footnote-label" class="sr-only">Footnotes</h2>\n<ol>\n';
        for (var j = 0; j < keys.length; j++) {
            var nn = keys[j];
            section += '<li id="fn-' + nn + '">' + parseMd(footnoteDefs[nn]) + ' <a href="#fnref-' + nn + '" data-footnote-backref aria-label="Back to reference ' + nn + '">↩</a></li>\n';
        }
        section += '</ol>\n</section>';
        html += section;
        footnoteDefs = {};
        html = html.replace(/\u200B/g, '');
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

        // Fix CJK-adjacent emphasis markers: marked.js requires word boundaries
        // around ** / *, but Chinese characters aren't word chars.
        // Insert zero-width space so marked can parse them.
        var cjk = '\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\u3001\u3002\u300a\u300b\u2018\u2019\u201c\u201d\u2026\u2014\u3008\u3009\u300c\u300d';
        var reAfter = new RegExp('([' + cjk + '])(\\*\\*|__|\\*|_)', 'g');
        var reBefore = new RegExp('(\\*\\*|__|\\*|_)([' + cjk + '])', 'g');
        text = text.replace(reAfter, '$1\u200B$2');
        text = text.replace(reBefore, '$1\u200B$2');

        return text;
    }

    var api = { preprocess: preprocess, restoreLatex: restoreLatex, restoreFootnotes: restoreFootnotes };

    if (typeof window !== 'undefined') window.mdPreprocess = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
