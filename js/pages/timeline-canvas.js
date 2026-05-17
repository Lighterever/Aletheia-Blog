/**
 * TimelineCanvas — Interactive horizontal timeline (/timeline).
 * Virtual coordinate canvas with pan (left-drag / touch), zoom (⌘+scroll / pinch),
 * click-to-expand detail cards, topic bars with freeze-pane labels,
 * node merging, ongoing indicators, topic filtering, date search,
 * locate-to-today, expand/collapse all, keyboard navigation, tips overlay.
 */

import { escapeHtml, formatDate, decodeContent } from '../utils.js';

class TimelineCanvas {
    constructor(containerId) {
        this.viewport = document.getElementById(containerId || 'canvasViewport');
        this.content = document.getElementById('canvasContent');

        this.scale = 1.0;
        this.translateX = 0;
        this.translateY = 0;
        this.minScale = 0.25;
        this.maxScale = 2.0;
        this.pixelsPerDay = 50;
        this.prevZoomLevel = 'card';

        this.isDragging = false;
        this._dragMoved = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.lastTranslateX = 0;
        this.lastTranslateY = 0;

        this.zoomStep = 0.05;
        this.zoomAnimationDuration = 150;

        this.expandedNodes = new Set();
        this.selectedTopicIds = new Set();

        this.data = typeof window.timelineData !== 'undefined' ? window.timelineData : [];

        this.canvasWidth = 0;
        this.canvasHeight = 0;

        this.cardOverflowPadding = 0;

        this.nodePositions = new Map();

        this._boundOnMouseDown = this.onMouseDown.bind(this);
        this._boundOnMouseMove = this.onMouseMove.bind(this);
        this._boundOnMouseUp   = this.onMouseUp.bind(this);
        this._boundOnWheel     = this.onWheel.bind(this);
        this._boundOnKeyDown   = this.onKeyDown.bind(this);
        this._boundOnClickViewport = this.onClickViewport.bind(this);
        this._boundContextMenu = null;
        this._resizeTimer = null;
        this._boundOnResize = null;

        this._touchStartHandler = null;
        this._touchMoveHandler  = null;
        this._touchEndHandler   = null;

        this._controlClickHandlers = [];
        this._keyPanTimer = null;

        this.init();
    }

    init() {
        this.renderTimeline();
        this.bindEvents();
        this.updateTransform();
        this.initSearchBar();
        this.initLocateButton();
        this.updateTodayLabel();
        this.locateToToday();
    }

    renderTimeline() {
        if (!this.content || this.data.length === 0) {
            if (this.content) this.content.innerHTML = '<div class="timeline-empty">暂无学习记录</div>';
            return;
        }

        this.calculateCanvasSize();

        const canvas = document.createElement('div');
        canvas.className = 'timeline-canvas';
        canvas.style.width = this.canvasWidth + 'px';
        canvas.style.height = this.canvasHeight + 'px';

        var topicColors = ['#00ff88', '#7b8cde', '#bd93f9', '#ffb86c', '#ff79c6', '#50fa7b', '#8be9fd', '#f1fa8c'];
        var self = this;

        this.data.forEach(function(topic, topicIndex) {
            topic._color = topicColors[topicIndex % topicColors.length];
        });

        var barTopics = this.data.filter(function(t) { return !t._loose; });
        var barAreaHeight = barTopics.length > 0 ? barTopics.length * 36 + 20 : 10;

        var barLayer = document.createElement('div');
        barLayer.className = 'timeline-bar-layer';
        barLayer.style.height = barAreaHeight + 'px';
        canvas.appendChild(barLayer);

        var barIdx = 0;
        this.data.forEach(function(topic) {
            if (topic._loose) return;
            var bar = self.renderTopicBar(topic, barIdx);
            barLayer.appendChild(bar);
            barIdx++;
        });

        var timelineLine = document.createElement('div');
        timelineLine.className = 'timeline-main-line';
        timelineLine.style.top = (barAreaHeight + 30) + 'px';
        canvas.appendChild(timelineLine);

        var nodeLayer = document.createElement('div');
        nodeLayer.className = 'timeline-node-layer';
        nodeLayer.style.top = (barAreaHeight + 30) + 'px';
        nodeLayer.style.height = '40px';
        canvas.appendChild(nodeLayer);

        var tickLayer = document.createElement('div');
        tickLayer.className = 'timeline-tick-layer';
        tickLayer.style.top = (barAreaHeight + 74) + 'px';
        canvas.appendChild(tickLayer);
        this.renderTickLayer(tickLayer);

        var allNodes = [];

        var dateGroups = {};
        this.data.forEach(function(topic) {
            topic.entries.forEach(function(entry, entryIndex) {
                if (!dateGroups[entry.date]) {
                    dateGroups[entry.date] = [];
                }
                dateGroups[entry.date].push({ topic: topic, entry: entry, entryIndex: entryIndex });
            });
        });

        Object.keys(dateGroups).sort().forEach(function(date) {
            var group = dateGroups[date];
            var node = self.renderNode(group);
            allNodes.push({ node: node, date: date });
        });

        allNodes.sort(function(a, b) { return a.date.localeCompare(b.date); });

        allNodes.forEach(function(item) {
            nodeLayer.appendChild(item.node);
        });

        this.content.innerHTML = '';
        this.content.appendChild(canvas);

        this.buildNodePositionMap();
        this.updateZoomLevel();
        this.updateTransform();
    }

    calculateCanvasSize() {
        if (this.data.length === 0) {
            this.canvasWidth = 2000;
            this.canvasHeight = 400;
            return;
        }

        var minDate = new Date('2026-01-01');
        var maxDate = new Date(0);

        this.data.forEach(function(topic) {
            var end = topic.end ? new Date(topic.end) : new Date();
            if (end > maxDate) maxDate = end;
        });

        var days = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
        this.canvasWidth = Math.max(days * this.pixelsPerDay, 2000) + 400;

        var barCount = this.data.filter(function(t) { return !t._loose; }).length;
        var barAreaHeight = barCount > 0 ? barCount * 36 + 20 : 10;
        this.canvasHeight = barAreaHeight + 160 + this.cardOverflowPadding + 100;
    }

    renderTopicBar(topic, topicIndex) {
        var bar = document.createElement('div');
        bar.className = 'topic-bar';
        bar.style.top = (topicIndex * 36) + 'px';
        bar.style.background = topic._color;
        bar.dataset.topicId = topic.id;

        var label = document.createElement('span');
        label.className = 'topic-bar-label';
        label.textContent = topic.title;
        bar.appendChild(label);

        var startX = this.dateToX(topic.start);
        var endDate;
        if (topic.end) {
            endDate = topic.end;
        } else {
            endDate = new Date().toISOString().substring(0, 10);
            bar.classList.add('ongoing');
        }
        var endX = this.dateToX(endDate) + 20;
        bar.style.left = startX + 'px';
        bar.style.width = Math.max(endX - startX, 80) + 'px';

        var self = this;
        bar.addEventListener('click', function(e) {
            e.stopPropagation();
            var tid = bar.dataset.topicId;
            if (self.selectedTopicIds.has(tid)) {
                self.selectedTopicIds.delete(tid);
            } else {
                self.selectedTopicIds.add(tid);
            }
            self.applyTopicFilter();
        });

        return bar;
    }

    renderNode(group) {
        var first = group[0];
        var entry = first.entry;
        var topic = first.topic;

        var node = document.createElement('div');
        node.className = 'timeline-node';
        node.dataset.date = entry.date;

        var topicIdsInGroup = [];
        group.forEach(function(g) {
            topicIdsInGroup.push(g.topic.id);
        });
        node.dataset.topicIds = topicIdsInGroup.join(',');

        var x = this.dateToX(entry.date);
        node.style.left = x + 'px';

        var dot = document.createElement('div');
        dot.className = 'node-dot';

        if (group.length > 1) {
            dot.classList.add('merged');
        }

        var hasInsight = group.some(function(g) { return g.entry.isInsight; });
        if (hasInsight) {
            dot.classList.add('insight');
        }

        if (group.some(function(g) { return g.entry.date === g.topic.start; })) {
            dot.classList.add('milestone');
        }

        if (group.some(function(g) { return !g.topic.end && g.entryIndex === g.topic.entries.length - 1; })) {
            dot.classList.add('current');
        }

        dot.style.background = topic._color || 'var(--node-default)';
        if (hasInsight) {
            dot.style.background = '';
        }

        node.appendChild(dot);

        var dateLabel = document.createElement('div');
        dateLabel.className = 'node-date';
        dateLabel.textContent = this.formatDateForZoom(entry.date);
        node.appendChild(dateLabel);

        var card = this.renderCard(group);
        node.appendChild(card);

        node.dataset.pinned = 'false';

        dot.addEventListener('mouseenter', function(e) {
            e.stopPropagation();
            if (node.dataset.pinned !== 'true') {
                node.classList.add('hover-expanded');
            }
        });

        dot.addEventListener('mouseleave', function() {
            if (node.dataset.pinned !== 'true') {
                node.classList.remove('hover-expanded');
            }
        });

        var self = this;
        node.addEventListener('click', function(e) {
            if (e.button === 0) {
                if (node.dataset.pinned === 'true') {
                    node.dataset.pinned = 'false';
                    node.classList.remove('expanded');
                    self.expandedNodes.delete(entry.date);
                    node.classList.remove('hover-expanded');
                } else {
                    node.dataset.pinned = 'true';
                    node.classList.add('expanded');
                    node.classList.add('hover-expanded');
                    self.expandedNodes.add(entry.date);
                    self.checkCardOverflow();
                }
            }
        });

        return node;
    }

    renderCard(group) {
        var card = document.createElement('div');
        card.className = 'node-card';

        var firstEntry = group[0].entry;

        var header = document.createElement('div');
        header.className = 'card-header';

        var date = document.createElement('span');
        date.className = 'card-date';
        date.textContent = firstEntry.date;
        header.appendChild(date);

        var closeBtn = document.createElement('button');
        closeBtn.className = 'card-close';
        closeBtn.innerHTML = '\u00D7';
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            this.collapseNode(firstEntry.date);
        }.bind(this));
        header.appendChild(closeBtn);

        card.appendChild(header);

        var content = document.createElement('div');
        content.className = 'card-content';

        group.forEach(function(g) {
            if (g.entry.isInsight) {
                var insight = document.createElement('div');
                insight.className = 'card-insight';
                insight.innerHTML = '\uD83D\uDCA1 \u7075\u611F\u65F6\u523B';
                content.appendChild(insight);
            }

            if (group.length > 1) {
                var topicLabel = document.createElement('div');
                topicLabel.className = 'card-topic-label';
                topicLabel.textContent = g.topic.title;
                content.appendChild(topicLabel);
            }

            var contentHtml = this.formatContent(decodeContent(g.entry.content));
             var entryDiv = document.createElement('div');
             entryDiv.className = 'card-entry';
             entryDiv.innerHTML = contentHtml;
             content.appendChild(entryDiv);
        }.bind(this));

        card.appendChild(content);

        var allTags = [];
        group.forEach(function(g) {
            if (g.entry.tags && g.entry.tags.length > 0) {
                allTags = allTags.concat(g.entry.tags);
            }
            if (g.topic.tags && g.topic.tags.length > 0) {
                allTags = allTags.concat(g.topic.tags);
            }
        });
        var uniqueTags = [];
        allTags.forEach(function(t) {
            if (uniqueTags.indexOf(t) === -1) uniqueTags.push(t);
        });

        if (uniqueTags.length > 0) {
            var tags = document.createElement('div');
            tags.className = 'card-tags';
            uniqueTags.forEach(function(tag) {
                var tagEl = document.createElement('span');
                tagEl.className = 'card-tag';
                tagEl.textContent = '#' + tag;
                tags.appendChild(tagEl);
            });
            card.appendChild(tags);
        }

        var hasArticleLinks = false;
        group.forEach(function(g) {
            if (g.entry.articleLink) {
                hasArticleLinks = true;
            }
        });

        if (hasArticleLinks) {
            var linkSection = document.createElement('div');
            linkSection.className = 'card-article-links';

            var seenLinks = {};
            group.forEach(function(g) {
                var link = g.entry.articleLink;
                if (link && !seenLinks[link]) {
                    seenLinks[link] = true;
                    var article = typeof window.articles !== 'undefined' ? window.articles.find(function(a) { return a.id === link; }) : null;
                    var linkEl = document.createElement('a');
                    linkEl.className = 'card-article-link';
                    linkEl.href = '/article/' + encodeURIComponent(link);
                    linkEl.textContent = '阅读文章：' + (article ? article.title : link);
                    linkEl.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        var el = e.currentTarget;
                        var href = el.getAttribute('href');
                        var path = href.replace(/^\//, '');
                        if (path.startsWith('article/')) {
                            var id = path.replace('article/', '');
                            var art = typeof window.articles !== 'undefined' ? window.articles.find(function(a) { return a.id === id; }) : null;
                            if (art && window.__app) {
                                window.__app.openBlogArticle(art);
                            }
                        }
                    });
                    linkSection.appendChild(linkEl);
                }
            });

            card.appendChild(linkSection);
        }

        return card;
    }

    formatContent(content) {
        let formatted = content.replace(/\uD83D\uDCA1\s*/g, '');

        formatted = formatted.replace(/(^- .+\n?)+/gm, (match) => {
            const items = match.trim().split('\n').map(item =>
                '<li>' + item.replace(/^- /, '') + '</li>'
            ).join('');
            return '<ul>' + items + '</ul>';
        });

        formatted = formatted.split('\n\n').map(block => {
            const trimmed = block.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('<ul>')) return trimmed;
            return '<p>' + trimmed + '</p>';
        }).join('');

        return formatted;
    }

    dateToX(dateStr) {
        if (this.data.length === 0) return 200;

        var date = new Date(dateStr);
        var minDate = new Date('2026-01-01');

        var daysSinceStart = Math.ceil((date - minDate) / (1000 * 60 * 60 * 24));
        return 200 + daysSinceStart * this.pixelsPerDay;
    }

    renderTickLayer(layer) {
        if (typeof window.renderedTicks === 'undefined') window.renderedTicks = [];
        layer.innerHTML = '';

        var allDates = [];
        this.data.forEach(function(topic) {
            topic.entries.forEach(function(e) { allDates.push(e.date); });
        });
        allDates.sort();

        var minDate = new Date('2026-01-01');
        var maxDate = new Date(allDates[allDates.length - 1]);

        var ticks = [];

        if (this.scale <= 0.3) {
            var startY = minDate.getFullYear();
            var endY = maxDate.getFullYear();
            for (var y = startY; y <= endY; y++) {
                var pos = this.dateToX(y + '-01-01');
                ticks.push({ x: pos, label: String(y), cls: 'tick-year' });
            }
        } else if (this.scale <= 0.6) {
            var y = minDate.getFullYear();
            var m = minDate.getMonth() + 1;
            var y2 = maxDate.getFullYear();
            var m2 = maxDate.getMonth() + 1;
            var currY = y, currM = m;
            while (currY < y2 || (currY === y2 && currM <= m2)) {
                var mm = String(currM).padStart(2, '0');
                var pos = this.dateToX(currY + '-' + mm + '-01');
                ticks.push({ x: pos, label: currY + '/' + currM, cls: 'tick-month' });
                currM++;
                if (currM > 12) { currM = 1; currY++; }
            }
        }

        var self = this;
        ticks.forEach(function(t) {
            var el = document.createElement('span');
            el.className = 'tick-label ' + t.cls;
            el.textContent = t.label;
            el.style.left = t.x + 'px';
            layer.appendChild(el);
        });
    }

    updateTickLayer() {
        var layer = this.content.querySelector('.timeline-tick-layer');
        if (!layer) return;
        var barTopics = this.data.filter(function(t) { return !t._loose; });
        var barAreaHeight = barTopics.length > 0 ? barTopics.length * 36 + 20 : 10;
        layer.style.top = (barAreaHeight + 74) + 'px';
        this.renderTickLayer(layer);
    }

    formatDateForZoom(dateStr) {
        if (this.scale <= 0.3) {
            return '';
        }
        if (this.scale <= 0.6) {
            return '';
        }
        return dateStr;
    }

    bindEvents() {
        this.viewport.addEventListener('mousedown', this._boundOnMouseDown);
        document.addEventListener('mousemove', this._boundOnMouseMove);
        document.addEventListener('mouseup', this._boundOnMouseUp);
        this.viewport.addEventListener('click', this._boundOnClickViewport);

        this._boundContextMenu = (e) => { e.preventDefault(); };
        this.viewport.addEventListener('contextmenu', this._boundContextMenu);

        this.viewport.addEventListener('wheel', this._boundOnWheel, { passive: false });

        document.addEventListener('keydown', this._boundOnKeyDown);

        this._boundOnResize = this.debounce(() => {
            this.centerView();
        }, 200);
        window.addEventListener('resize', this._boundOnResize);

        this.initTouchGestures();
        this.bindControlEvents();
    }

    onMouseDown(e) {
        if (e.button === 0) {
            var t = e.target;
            while (t && t !== this.viewport) {
                if (t.matches && (t.matches('.timeline-node, .timeline-node *, .topic-bar, .node-card, .node-card *'))) {
                    return;
                }
                t = t.parentElement;
            }
            this.isDragging = true;
            this._dragMoved = false;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.lastTranslateX = this.translateX;
            this.lastTranslateY = this.translateY;
            this.viewport.style.cursor = 'grabbing';
            e.preventDefault();
        }
    }

    onMouseMove(e) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;

        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
            this._dragMoved = true;
        }

        this.translateX = this.lastTranslateX + deltaX;
        this.translateY = this.lastTranslateY + deltaY;

        this.updateTransform();
    }

    onMouseUp(e) {
        if (e.button === 0 && this.isDragging) {
            this.isDragging = false;
            this.viewport.style.cursor = '';
            if (this._dragMoved) {
                e.stopPropagation();
            }
        }
    }

    onWheel(e) {
        e.preventDefault();

        if (e.metaKey || e.ctrlKey) {
            var delta = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
            var newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale + delta));

            if (newScale !== this.scale) {
                var rect = this.viewport.getBoundingClientRect();
                var mouseX = e.clientX - rect.left;
                var oldCanvasX = mouseX - this.translateX;
                var oldPpd = this.pixelsPerDay;
                var daysFromStart = (oldCanvasX - 200) / oldPpd;

                this.scale = newScale;
                this.pixelsPerDay = Math.round(50 * Math.pow(this.scale, 1.3));
                this.updateZoomLevel();

                var self = this;
                if (this._zoomRAF) cancelAnimationFrame(this._zoomRAF);
                this._zoomRAF = requestAnimationFrame(function() {
                    self.calculateCanvasSize();
                    var canvas = self.content.querySelector('.timeline-canvas');
                    if (canvas) {
                        canvas.style.width = self.canvasWidth + 'px';
                        canvas.style.height = self.canvasHeight + 'px';
                    }
                    repositionDOM(self);
                    var newAnchorX = 200 + daysFromStart * self.pixelsPerDay;
                    self.translateX = mouseX - newAnchorX;
                    self.updateTransform();
                });

                this.updateZoomUI();
            }
        } else {
            this.translateX -= e.deltaX;
            this.translateY -= e.deltaY;
            this.updateTransform();
        }
    }

    repositionAll() {
        if (this.data.length === 0) return;
        this.calculateCanvasSize();
        var canvas = this.content.querySelector('.timeline-canvas');
        if (canvas) {
            canvas.style.width = this.canvasWidth + 'px';
            canvas.style.height = this.canvasHeight + 'px';
        }
        repositionDOM(this);
        this.buildNodePositionMap();
        this.updateZoomLevel();
        this.updateTransform();
    }

    setScale(newScale, animate) {
        var rect = this.viewport.getBoundingClientRect();
        var centerX = rect.width / 2;
        var oldCanvasX = centerX - this.translateX;
        var oldPpd = this.pixelsPerDay;
        var daysFromStart = (oldCanvasX - 200) / oldPpd;
        var mouseX = centerX;

        this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
        this.pixelsPerDay = Math.round(50 * Math.pow(this.scale, 1.3));
        this.updateZoomLevel();

        var self = this;
        if (this._zoomRAF) cancelAnimationFrame(this._zoomRAF);
        this._zoomRAF = requestAnimationFrame(function() {
            self.calculateCanvasSize();
            var canvas = self.content.querySelector('.timeline-canvas');
            if (canvas) {
                canvas.style.width = self.canvasWidth + 'px';
                canvas.style.height = self.canvasHeight + 'px';
            }
            repositionDOM(self);
            var newAnchorX = 200 + daysFromStart * self.pixelsPerDay;
            self.translateX = mouseX - newAnchorX;
            self.updateTransform();
        });

        this.updateZoomUI();
    }

    updateTransform() {
        this.clampTranslate();
        this.content.style.transform = 'translate(' + this.translateX + 'px, ' + this.translateY + 'px)';
        this.updateBarLabels();
    }

    clampTranslate() {
        if (!this.viewport) return;
        var vpRect = this.viewport.getBoundingClientRect();
        var vpW = vpRect.width;
        var vpH = vpRect.height;

        var canvasW = this.canvasWidth;
        var canvasH = this.canvasHeight;

        var minTx = Math.min(0, vpW - canvasW - 200);
        var maxTx = 200;
        this.translateX = Math.max(minTx, Math.min(maxTx, this.translateX));

        var minTy = Math.min(0, vpH - canvasH);
        var maxTy = 0;
        this.translateY = Math.max(minTy, Math.min(maxTy, this.translateY));
    }

    updateBarLabels() {
        if (!this.viewport) return;
        var vpRect = this.viewport.getBoundingClientRect();
        var vpLeft = -this.translateX;
        var vpRight = vpLeft + vpRect.width;

        var self = this;
        this.content.querySelectorAll('.topic-bar').forEach(function(bar) {
            var label = bar.querySelector('.topic-bar-label');
            if (!label) return;
            label.style.transform = '';
            label.style.paddingLeft = '';

            var barLeft = parseFloat(bar.style.left);
            var barWidth = parseFloat(bar.style.width);
            var barRight = barLeft + barWidth;
            if (barWidth <= 0) return;

            if (barRight < vpLeft || barLeft > vpRight) return;

            var paddingLeftPx = 12;
            if (barLeft < vpLeft) {
                var shift = vpLeft - barLeft;
                label.style.paddingLeft = (paddingLeftPx + shift) + 'px';
            }
        });
    }

    onClickViewport(e) {
        if (e.button !== 0) return;
        var target = e.target;
        while (target && target !== this.viewport) {
            if (target.classList.contains('topic-bar') || target.classList.contains('timeline-node')) {
                return;
            }
            target = target.parentElement;
        }
        this.clearTopicFilter();
    }

    applyTopicFilter() {
        var self = this;
        this.content.querySelectorAll('.timeline-node').forEach(function(node) {
            var ids = (node.dataset.topicIds || '').split(',');
            if (self.selectedTopicIds.size === 0) {
                node.classList.remove('dimmed');
            } else {
                var match = ids.some(function(id) { return self.selectedTopicIds.has(id); });
                if (match) {
                    node.classList.remove('dimmed');
                } else {
                    node.classList.add('dimmed');
                }
            }
        });
        this.content.querySelectorAll('.topic-bar').forEach(function(bar) {
            var tid = bar.dataset.topicId;
            if (self.selectedTopicIds.has(tid)) {
                bar.classList.add('selected');
            } else {
                bar.classList.remove('selected');
                bar.style.animation = 'none';
                bar.style.opacity = '0.85';
            }
        });
    }

    clearTopicFilter() {
        this.selectedTopicIds.clear();
        this.applyTopicFilter();
    }

    updateZoomLevel() {
        var level = 'card';
        if (this.scale <= 0.3) level = 'overview';
        else if (this.scale <= 0.6) level = 'mini';
        else if (this.scale >= 1.2) level = 'full';

        this.content.dataset.zoom = level;
    }

    updateZoomUI() {
        var slider = document.getElementById('zoomSlider');
        if (slider) {
            slider.value = this.scale * 100;
        }

        var valueEl = document.getElementById('zoomValue');
        if (valueEl) {
            valueEl.textContent = Math.round(this.scale * 100) + '%';
        }
    }

    debounce(fn, delay) {
        var self = this;
        return function() {
            var args = arguments;
            clearTimeout(self._resizeTimer);
            self._resizeTimer = setTimeout(function() {
                fn.apply(self, args);
            }, delay);
        };
    }

    initTouchGestures() {
        var self = this;
        var lastTouchDistance = 0;
        var singleTouchStart = null;
        var singleTouchMoved = false;

        this._touchStartHandler = function(e) {
            if (e.touches.length === 2) {
                e.preventDefault();
                singleTouchStart = null;
                var t1 = e.touches[0];
                var t2 = e.touches[1];
                lastTouchDistance = Math.hypot(
                    t2.clientX - t1.clientX,
                    t2.clientY - t1.clientY
                );
            } else if (e.touches.length === 1) {
                singleTouchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                singleTouchMoved = false;
                self.lastTranslateX = self.translateX;
                self.lastTranslateY = self.translateY;
            } else {
                singleTouchStart = null;
            }
        };
        this.viewport.addEventListener('touchstart', this._touchStartHandler, { passive: false });

        this._touchMoveHandler = function(e) {
            if (e.touches.length === 2) {
                e.preventDefault();
                singleTouchStart = null;

                var t1 = e.touches[0];
                var t2 = e.touches[1];

                var distance = Math.hypot(
                    t2.clientX - t1.clientX,
                    t2.clientY - t1.clientY
                );

                var center = {
                    x: (t1.clientX + t2.clientX) / 2,
                    y: (t1.clientY + t2.clientY) / 2
                };

                if (lastTouchDistance > 0) {
                    var scaleDelta = distance / lastTouchDistance;
                    var newScale = Math.max(
                        self.minScale,
                        Math.min(self.maxScale, self.scale * scaleDelta)
                    );

                    if (newScale !== self.scale) {
                        var rect = self.viewport.getBoundingClientRect();
                        var tx = center.x - rect.left;
                        var oldCanvasX = tx - self.translateX;
                        var oldPpd = self.pixelsPerDay;
                        var daysFromStart = (oldCanvasX - 200) / oldPpd;

                        self.scale = newScale;
                        self.pixelsPerDay = Math.round(50 * Math.pow(self.scale, 1.3));
                        self.updateZoomLevel();

                        if (self._zoomRAF) cancelAnimationFrame(self._zoomRAF);
                        self._zoomRAF = requestAnimationFrame(function() {
                            self.calculateCanvasSize();
                            var canvas2 = self.content.querySelector('.timeline-canvas');
                            if (canvas2) {
                                canvas2.style.width = self.canvasWidth + 'px';
                                canvas2.style.height = self.canvasHeight + 'px';
                            }
                            repositionDOM(self);
                            var newAnchorX = 200 + daysFromStart * self.pixelsPerDay;
                            self.translateX = tx - newAnchorX;
                            self.updateTransform();
                        });
                        self.updateZoomUI();
                    }
                }

                lastTouchDistance = distance;
            } else if (e.touches.length === 1 && singleTouchStart) {
                var dx = e.touches[0].clientX - singleTouchStart.x;
                var dy = e.touches[0].clientY - singleTouchStart.y;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                    singleTouchMoved = true;
                }
                if (singleTouchMoved) {
                    e.preventDefault();
                }
                self.translateX = self.lastTranslateX + dx;
                self.translateY = self.lastTranslateY + dy;
                self.updateTransform();
            }
        };
        this.viewport.addEventListener('touchmove', this._touchMoveHandler, { passive: false });

        this._touchEndHandler = function() {
            lastTouchDistance = 0;
            if (singleTouchStart) {
                self.lastTranslateX = self.translateX;
                self.lastTranslateY = self.translateY;
            }
            singleTouchStart = null;
        };
        this.viewport.addEventListener('touchend', this._touchEndHandler);
    }

    toggleNode(node, date) {
        if (this.expandedNodes.has(date)) {
            this.collapseNode(date);
        } else {
            this.expandNode(node, date);
        }
    }

    expandNode(node, date) {
        node.classList.add('expanded');
        node.classList.add('hover-expanded');
        node.dataset.pinned = 'true';
        this.expandedNodes.add(date);
        this.checkCardOverflow();
    }

    expandAll() {
        this.expandedNodes.clear();
        var self = this;
        this.content.querySelectorAll('.timeline-node').forEach(function(node) {
            node.classList.add('expanded');
            node.classList.add('hover-expanded');
            node.dataset.pinned = 'true';
            self.expandedNodes.add(node.dataset.date);
        });
        this.checkCardOverflow();
    }

    collapseNode(date) {
        var node = this.content.querySelector('.timeline-node[data-date="' + date + '"]');
        if (!node) return;
        node.classList.remove('expanded');
        node.classList.remove('hover-expanded');
        node.dataset.pinned = 'false';
        this.expandedNodes.delete(date);
    }

    collapseAll() {
        this.content.querySelectorAll('.timeline-node.expanded').forEach(function(node) {
            node.classList.remove('expanded');
            node.classList.remove('hover-expanded');
            node.dataset.pinned = 'false';
        });
        this.expandedNodes.clear();
        this.cardOverflowPadding = 0;
        var barCount = this.data.filter(function(t) { return !t._loose; }).length;
        var barAreaHeight = barCount > 0 ? barCount * 36 + 20 : 10;
        this.canvasHeight = barAreaHeight + 160 + this.cardOverflowPadding + 100;
        var canvas = this.content.querySelector('.timeline-canvas');
        if (canvas) canvas.style.height = this.canvasHeight + 'px';
        this.clampTranslate();
        this.updateTransform();
    }

    checkCardOverflow() {
        var self = this;
        requestAnimationFrame(function() {
            var canvas = self.content.querySelector('.timeline-canvas');
            if (!canvas) return;

            var maxCardBottom = 0;

            self.content.querySelectorAll('.timeline-node.expanded .node-card').forEach(function(card) {
                var cardRect = card.getBoundingClientRect();
                var canvasRect = canvas.getBoundingClientRect();
                var cardBottomInCanvas = cardRect.bottom - canvasRect.bottom;
                if (cardBottomInCanvas > 0) {
                    maxCardBottom = Math.max(maxCardBottom, cardBottomInCanvas);
                }
            });

            if (maxCardBottom > self.cardOverflowPadding) {
                self.cardOverflowPadding = maxCardBottom + 20;
                self.canvasHeight = self.canvasHeight + (self.cardOverflowPadding > 0 ? self.cardOverflowPadding : 0);
                var barCount = self.data.filter(function(t) { return !t._loose; }).length;
                var barAreaHeight = barCount > 0 ? barCount * 36 + 20 : 10;
                self.canvasHeight = barAreaHeight + 160 + self.cardOverflowPadding + 100;
                canvas.style.height = self.canvasHeight + 'px';
                self.clampTranslate();
                self.updateTransform();
            }
        });
    }

    bindControlEvents() {
        var self = this;

        var expandAllBtn = document.getElementById('expandAllBtn');
        if (expandAllBtn) {
            var expandHandler = function() { self.expandAll(); };
            expandAllBtn.addEventListener('click', expandHandler);
            this._controlClickHandlers.push({ el: expandAllBtn, handler: expandHandler });
        }

        var collapseAllBtn = document.getElementById('collapseAllBtn');
        if (collapseAllBtn) {
            var collapseHandler = function() { self.collapseAll(); };
            collapseAllBtn.addEventListener('click', collapseHandler);
            this._controlClickHandlers.push({ el: collapseAllBtn, handler: collapseHandler });
        }

        var tipsBtn = document.getElementById('tipsBtn');
        var tipsOverlay = document.getElementById('tipsOverlay');
        var tipsClose = tipsOverlay ? tipsOverlay.querySelector('.tips-close') : null;
        if (tipsBtn && tipsOverlay) {
            tipsBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                tipsOverlay.classList.add('visible');
            });
            tipsOverlay.addEventListener('click', function(e) {
                if (e.target === tipsOverlay) {
                    tipsOverlay.classList.remove('visible');
                }
            });
            if (tipsClose) {
                tipsClose.addEventListener('click', function() {
                    tipsOverlay.classList.remove('visible');
                });
            }
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && tipsOverlay.classList.contains('visible')) {
                    tipsOverlay.classList.remove('visible');
                }
            });
        }

        var zoomSlider = document.getElementById('zoomSlider');
        if (zoomSlider) {
            var sliderHandler = function(e) {
                self.setScale(parseInt(e.target.value, 10) / 100, true);
            };
            zoomSlider.addEventListener('input', sliderHandler);
            this._controlClickHandlers.push({ el: zoomSlider, handler: sliderHandler });
        }
    }

    initLocateButton() {
        var self = this;
        var locateBtn = document.getElementById('locateBtn');
        if (!locateBtn) return;

        locateBtn.addEventListener('click', function() {
            self.locateToToday();
        });
    }

    updateTodayLabel() {
        var el = document.getElementById('timelineToday');
        if (el) {
            var now = new Date();
            var y = now.getFullYear();
            var m = String(now.getMonth() + 1).padStart(2, '0');
            var d = String(now.getDate()).padStart(2, '0');
            var weekdays = ['日', '一', '二', '三', '四', '五', '六'];
            var w = weekdays[now.getDay()];
            el.textContent = '📅 ' + y + '年' + m + '月' + d + '日 星期' + w;
        }
        var tbtn = document.getElementById('timelineThemeToggle');
        if (tbtn) {
            var t = document.documentElement.getAttribute('data-theme') || 'dark';
            tbtn.textContent = t === 'dark' ? '◐' : '◑';
        }
    }

    locateToToday() {
        var locateBtn = document.getElementById('locateBtn');
        if (!locateBtn) return;

        locateBtn.classList.add('locating');

        var today = new Date().toISOString().split('T')[0];

        var targetDate = null;
        var minDiff = Infinity;

        this.nodePositions.forEach(function(pos, date) {
            var diff = Math.abs(new Date(today) - new Date(date));
            if (diff < minDiff) {
                minDiff = diff;
                targetDate = date;
            }
        });

        if (targetDate) {
            this.jumpToDate(targetDate, true);
        }

        setTimeout(function() {
            locateBtn.classList.remove('locating');
        }, 800);
    }

    initSearchBar() {
        var self = this;
        var yearSelect = document.getElementById('yearSelect');
        var monthSelect = document.getElementById('monthSelect');
        var daySelect = document.getElementById('daySelect');
        var jumpBtn = document.getElementById('jumpBtn');

        if (!yearSelect) return;

        var years = this.getAvailableYears();
        years.forEach(function(year) {
            var option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });

        yearSelect.addEventListener('change', function() {
            self.updateMonths(yearSelect.value);
            daySelect.innerHTML = '<option value="">日期</option>';
        });

        monthSelect.addEventListener('change', function() {
            self.updateDays(yearSelect.value, monthSelect.value);
        });

        if (jumpBtn) {
            jumpBtn.addEventListener('click', function() {
                var year = yearSelect.value;
                var month = monthSelect.value;
                var day = daySelect.value;

                var targetDate = '';
                if (day) {
                    targetDate = year + '-' + month + '-' + day;
                } else if (month) {
                    targetDate = year + '-' + month + '-01';
                } else if (year) {
                    targetDate = year + '-01-01';
                }

                if (targetDate) {
                    self.jumpToDate(targetDate, true);
                }
            });
        }
    }

    getAvailableYears() {
        var years = new Set();

        this.data.forEach(function(topic) {
            topic.entries.forEach(function(entry) {
                years.add(entry.date.substring(0, 4));
            });
        });

        return Array.from(years).sort();
    }

    updateMonths(year) {
        var monthSelect = document.getElementById('monthSelect');
        if (!monthSelect) return;

        monthSelect.innerHTML = '<option value="">月份</option>';

        if (!year) return;

        var months = new Set();
        var prefix = year + '-';

        this.data.forEach(function(topic) {
            topic.entries.forEach(function(entry) {
                if (entry.date.startsWith(prefix)) {
                    months.add(entry.date.substring(5, 7));
                }
            });
        });

        Array.from(months).sort().forEach(function(month) {
            var option = document.createElement('option');
            option.value = month;
            option.textContent = month + '月';
            monthSelect.appendChild(option);
        });
    }

    updateDays(year, month) {
        var daySelect = document.getElementById('daySelect');
        if (!daySelect) return;

        daySelect.innerHTML = '<option value="">日期</option>';

        if (!year || !month) return;

        var prefix = year + '-' + month + '-';
        var days = new Set();

        this.data.forEach(function(topic) {
            topic.entries.forEach(function(entry) {
                if (entry.date.startsWith(prefix)) {
                    days.add(entry.date.substring(8, 10));
                }
            });
        });

        Array.from(days).sort().forEach(function(day) {
            var option = document.createElement('option');
            option.value = day;
            option.textContent = day + '日';
            daySelect.appendChild(option);
        });
    }

    jumpToDate(dateStr, animate) {
        var position = this.nodePositions.get(dateStr);

        if (!position) {
            return;
        }

        var rect = this.viewport.getBoundingClientRect();

        if (animate) {
            this.content.classList.add('animate-jump');
        }

        this.translateX = rect.width / 2 - position.x;
        this.translateY = rect.height / 2 - position.y;

        this.updateTransform();

        if (animate) {
            var self = this;
            setTimeout(function() {
                self.content.classList.remove('animate-jump');
            }, 400);
        }
    }

    buildNodePositionMap() {
        this.nodePositions.clear();

        var barCount = this.data.filter(function(t) { return !t._loose; }).length;
        var barAreaHeight = barCount > 0 ? barCount * 36 + 20 : 10;
        var self = this;
        this.content.querySelectorAll('.timeline-node').forEach(function(node) {
            var date = node.dataset.date;
            var x = parseFloat(node.style.left);
            var y = barAreaHeight + 30;

            self.nodePositions.set(date, { x: x, y: y });
        });
    }

    centerView() {
        var rect = this.viewport.getBoundingClientRect();

        this.translateX = (rect.width - this.canvasWidth) / 2;
        this.translateY = (rect.height - this.canvasHeight) / 2;

        this.updateTransform();
    }

    _smoothPan() {
        this.content.classList.add('smooth-zoom');
        var self = this;
        clearTimeout(this._keyPanTimer);
        this._keyPanTimer = setTimeout(function() {
            self.content.classList.remove('smooth-zoom');
        }, 160);
    }

    onKeyDown(e) {
        var page = document.getElementById('timelinePage');
        if (!page || page.classList.contains('hidden')) return;

        var PAN_STEP = 80;

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.translateX += PAN_STEP;
                this._smoothPan();
                this.updateTransform();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.translateX -= PAN_STEP;
                this._smoothPan();
                this.updateTransform();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.translateY -= PAN_STEP;
                this._smoothPan();
                this.updateTransform();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.translateY += PAN_STEP;
                this._smoothPan();
                this.updateTransform();
                break;
            case '+':
            case '=':
                e.preventDefault();
                this.setScale(this.scale + this.zoomStep, true);
                break;
            case '-':
            case '_':
                e.preventDefault();
                this.setScale(this.scale - this.zoomStep, true);
                break;
            case '0':
                e.preventDefault();
                this.setScale(1.0, true);
                break;
        }
    }

    destroy() {
        document.removeEventListener('mousemove', this._boundOnMouseMove);
        document.removeEventListener('mouseup', this._boundOnMouseUp);
        document.removeEventListener('keydown', this._boundOnKeyDown);

        if (this.viewport) {
            this.viewport.removeEventListener('mousedown', this._boundOnMouseDown);
            this.viewport.removeEventListener('wheel', this._boundOnWheel);

            if (this._boundContextMenu) {
                this.viewport.removeEventListener('contextmenu', this._boundContextMenu);
            }
        }

        if (this._boundOnResize) {
            window.removeEventListener('resize', this._boundOnResize);
            this._boundOnResize = null;
        }
        clearTimeout(this._resizeTimer);

        if (this.viewport) {
            if (this._touchStartHandler) {
                this.viewport.removeEventListener('touchstart', this._touchStartHandler);
                this._touchStartHandler = null;
            }
            if (this._touchMoveHandler) {
                this.viewport.removeEventListener('touchmove', this._touchMoveHandler);
                this._touchMoveHandler = null;
            }
            if (this._touchEndHandler) {
                this.viewport.removeEventListener('touchend', this._touchEndHandler);
                this._touchEndHandler = null;
            }
        }

        this._controlClickHandlers.forEach(function(item) {
            if (item.el) item.el.removeEventListener('click', item.handler);
        });
        this._controlClickHandlers = [];

        this.expandedNodes.clear();
        this.nodePositions.clear();
    }
}

function repositionDOM(self) {
    var barTopics = self.data.filter(function(t) { return !t._loose; });
    var barAreaHeight = barTopics.length > 0 ? barTopics.length * 36 + 20 : 10;

    var timelineLine = self.content.querySelector('.timeline-main-line');
    if (timelineLine) timelineLine.style.top = (barAreaHeight + 30) + 'px';

    var nodeLayer = self.content.querySelector('.timeline-node-layer');
    if (nodeLayer) nodeLayer.style.top = (barAreaHeight + 30) + 'px';

    self.content.querySelectorAll('.topic-bar').forEach(function(bar) {
        var topicId = bar.dataset.topicId;
        var topic = self.data.find(function(t) { return t.id === topicId; });
        if (!topic) return;
        var startX = self.dateToX(topic.start);
        var endDate;
        if (topic.end) {
            endDate = topic.end;
        } else {
            endDate = new Date().toISOString().substring(0, 10);
            bar.classList.add('ongoing');
        }
        var endX = self.dateToX(endDate) + 20;
        bar.style.left = startX + 'px';
        bar.style.width = Math.max(endX - startX, 80) + 'px';
    });

    self.content.querySelectorAll('.timeline-node').forEach(function(node) {
        var d = node.dataset.date;
        var x = self.dateToX(d);
        node.style.left = x + 'px';
        var dateLabel = node.querySelector('.node-date');
        if (dateLabel) dateLabel.textContent = self.formatDateForZoom(d);
    });

    self.buildNodePositionMap();
    self.updateTickLayer();
}

export { TimelineCanvas };
