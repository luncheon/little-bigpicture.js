var little = (function () {
    'use strict';

    this.bigpicture = function (element) {
        var parsePixel = function (pixel) { return parseFloat(pixel.replace(/px$/, '')); }

        var $container = $('<div>')
            .addClass('little-bigpicture-container')
            .insertBefore(element);

        var $view = $.extend($(element), {
            json: {
                formatVersion: 0.1,
                extract: function (jsonString) {
                    var data = JSON.parse(jsonString);
                    if (data && data.formatVersion === this.formatVersion) {
                        $view.find('.text').remove();
                        $view.scale(data.view.scale).css({ left: data.view.x, top: data.view.y });
                        data.text.forEach(function (item) {
                            $view.text.create(item.x, item.y, item.size).html(item.html);
                        });
                    }
                },
                generate: function () {
                    return JSON.stringify({
                        formatVersion: this.formatVersion,
                        view: { x: parsePixel($view.css('left')), y: parsePixel($view.css('top')), scale: $view.scale() },
                        text: Array.prototype.map.call($('.text'), function (item) {
                            return { x: $view.text.x(item), y: $view.text.y(item), size: $view.text.size(item), html: $(item).html() }
                        }),
                    });
                },
            },
            localStorage: {
                defaultName: 'default',
                load:   function (name) { $view.json.extract(localStorage.getItem(name || this.defaultName)); },
                save:   function (name) { localStorage.setItem(name || this.defaultName, $view.json.generate()); },
                remove: function (name) { localStorage.removeItem(name || this.defaultName); },
            },
            url: {
                queryPrefix: '?data=',
                parse: function () {
                    if (location.search && location.search.slice(0, this.queryPrefix.length) === this.queryPrefix) {
                        $view.json.extract(LZString.decompressFromEncodedURIComponent(location.search.slice(this.queryPrefix.length)));
                    }
                },
                generate: function () {
                    return location.protocol + '//' + location.host + location.pathname + this.queryPrefix + LZString.compressToEncodedURIComponent($view.json.generate());
                },
            },
            scale: function (scale) {
                if (scale === void 0) {
                    return this.data('scale');
                } else {
                    return this.data('scale', scale).css('transform', 'scale(' + scale + ')').trigger('scale', scale);
                }
            },
            focusingScale: function (rate, centerX, centerY) {
                centerX = typeof(centerX) === 'number' ? centerX : $container.width() / 2;
                centerY = typeof(centerY) === 'number' ? centerY : $container.height() / 2;
                return this.scale(this.scale() * rate)
                    .x((this.x() + centerX) * rate - centerX)
                    .y((this.y() + centerY) * rate - centerY);
            },
            x: function (x) {
                if (x === void 0) {
                    return -this.offset().left
                } else {
                    return this.offset({left: -x, top: this.offset().top}).trigger('offset');
                }
            },
            y: function (y) {
                if (y === void 0) {
                    return -this.offset().top;
                } else {
                    return this.offset({left: this.offset().left, top: -y}).trigger('offset');
                }
            },
            text: {
                create: function (x, y, size) {
                    var $text = $('<div>').addClass('text');
                    this.x($text, x);
                    this.y($text, y);
                    this.size($text, size);
                    return $text.appendTo($view);
                },
                createOnPageCoordinate: function (pageX, pageY) {
                    return this.create((pageX + $view.x()) / $view.scale(), (pageY + $view.y()) / $view.scale(), 20 / $view.scale());
                },
                x:    function (element, x) { return x === void 0 ? parsePixel($(element).css('left'))     : $(element).css('left',     x + 'px'); },
                y:    function (element, y) { return y === void 0 ? parsePixel($(element).css('top'))      : $(element).css('top',      y + 'px'); },
                size: function (element, s) { return s === void 0 ? parsePixel($(element).css('fontSize')) : $(element).css('fontSize', s + 'px'); },
                select: function (element) {
                    $view.find('.selected').removeClass('selected');
                    element && $(element).addClass('selected');
                    $view.trigger('select', element);
                    return element && $(element);
                },
                beginEdit: function (element) {
                    return this.select($(element)).attr('contentEditable', true).focus();
                },
                endEdit: function (element) {
                    var $text = $(element);
                    if ($text.text()) {
                        $text.attr('contentEditable', false);
                    } else {
                        $text.remove();
                        this.select(null);
                    }
                },
                link: function (element, link) {
                    if (link === void 0) {
                        return $(element).find('a').attr('href');
                    } else {
                        $(element).find('a').remove();
                        link && $('<a>').addClass('fa fa-external-link').attr({ href: link, target: '_blank' }).appendTo(element);
                        return $(element);
                    }
                },
            },
            biggest: {
                previous: null,
                rectangle: function () {
                    var left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
                    $view.find('.text').each(function () {
                        left   = Math.min(left,   $view.text.x(this));
                        top    = Math.min(top,    $view.text.y(this));
                        right  = Math.max(right,  $view.text.x(this) + $(this).width());
                        bottom = Math.max(bottom, $view.text.y(this) + $(this).height());
                    });
                    return { left: left, top: top, right: right, bottom: bottom, width: right - left, height: bottom - top, centerX: (left + right) / 2, centerY: (top + bottom) / 2 };
                },
                show: function () {
                    var previous = { offset: $view.offset(), scale: $view.scale() };
                    var rect = this.rectangle();
                    var scale = Math.min($container.width() / rect.width, $container.height() / rect.height) * 0.9;
                    $view.scale(scale)
                         .x(rect.centerX * scale - $container.width() / 2)
                         .y(rect.centerY * scale - $container.height() / 2)
                    this.previous = previous;
                    return this;
                },
                toggle: function () {
                    if (this.previous) {
                        var previous = this.previous;
                        $view.scale(previous.scale).offset(previous.offset);
                    } else {
                        this.show();
                    }
                },
            },
        });

        $view.addClass('little-bigpicture-content')
             .scale($view.data('scale') || 1).x($view.data('x') || 0).y($view.data('y') || 0)
             .on('scale offset', function (e) { $view.biggest.previous = null; })
             .appendTo($container)
             .find('.text').each(function () { $(this).css({ left: $(this).data('x'), top: $(this).data('y'), fontSize: $(this).data('size') + 'px' }); });

        // trigger 'clicked' and 'dragging' events.
        //   [mousedown -> mousemove -> mouseup]     raises 'click' event by jQuery.
        //   [mousedown -> mouseup (NOT mousemoved)] raises 'clicked' event by following code.
        (function () {
            var clone = function (e) {
                var touches = [];
                for (var i = 0, len = e.touches.length; i < len; i++) {
                    touches.push({ pageX: e.touches[i].pageX, pageY: e.touches[i].pageY });
                }
                return { target: e.target, touches: touches };
            }

            var mouse = null, mousedown = null, mousemoved = false;
            var touch = null, touchdown = null, touchmoved = false;
            $(document)
                .on('mousedown',  function (e) { mousemoved = false; mouse = mousedown = e; })
                .on('touchstart', function (e) { touchmoved = false; touch = touchdown = clone(e.originalEvent); })
                .on('mouseup',    function (e) { mousedown = null; mousemoved || $(e.target).trigger('clicked', e); })
                .on('touchend',   function (e) { touchdown = null; touchmoved || $(e.target).trigger('clicked', e.originalEvent.changedTouches[0]); })
                .on('mousemove',  function (e) {
                    if (!mousedown || (mouse.pageX === e.pageX && mouse.pageY === e.pageY)) {
                        return;
                    }
                    mousemoved = true;
                    $(mousedown.target).trigger('dragging', [mouse, e]);
                    mouse = e;
                })
                .on('touchmove',  function (e) {
                    touchmoved = true;
                    $(touchdown.target).trigger('dragging', [touch.touches[0], e.originalEvent.touches[0]]);
                    touch = clone(e.originalEvent);
                });
        })();

        // text event handlers
        (function () {
            $(document)
                .on('keydown',  '.text',                function (e) { e.keyCode === 27 && this.blur(); })  // blur on esc key
                .on('blur',     '.text',                function (e) { $view.text.endEdit(this); })
                .on('clicked',  '.text.selected',       function ()  { $view.text.beginEdit(this); })
                .on('clicked',  '.text:not(.selected)', function ()  { $view.text.select(this); })
                .on('dragging', '.text.selected',       function (_, previous, current) {
                    $(this).offset({
                        left: $(this).offset().left + (current.pageX - previous.pageX) / $view.scale(),
                        top:  $(this).offset().top  + (current.pageY - previous.pageY) / $view.scale(),
                    });
                })
                ;
        })();

        var previousTouches = null;
        $container
            .on('dragstart gesturestart touchend', function (e) { e.preventDefault(); })
            .on('mousedown touchstart', function (e) { $(e.target).hasClass('selected') || $view.text.select(null); })
            .on('dragging', function (e, previous, current) {
                $(e.target).hasClass('selected') || $view.x($view.x() + previous.pageX - current.pageX).y($view.y() + previous.pageY - current.pageY);
            })
            .on('clicked', function (_, e) {
                $(e.target).hasClass('text') || $view.text.beginEdit($view.text.createOnPageCoordinate(e.pageX, e.pageY));
            })
            .on('wheel', function (e) {
                e.preventDefault();
                var o = e.originalEvent;
                $view.focusingScale(o.deltaY < 0 ? 1.6 : 0.625, o.pageX, o.pageY);
            })
            .on('touchmove', function (e) {
                e.preventDefault();
                var touches = e.originalEvent.touches;
                if (touches && previousTouches && touches.length >= 2 && previousTouches.length >= 2) {
                    $view.focusingScale(
                        Math.sqrt(Math.pow(touches[0].pageX - touches[1].pageX, 2) + Math.pow(touches[0].pageY - touches[1].pageY, 2)) /
                        Math.sqrt(Math.pow(previousTouches[0].pageX - previousTouches[1].pageX, 2) + Math.pow(previousTouches[0].pageY - previousTouches[1].pageY, 2)),
                        (touches[0].pageX + touches[1].pageX) / 2,
                        (touches[0].pageY + touches[1].pageY) / 2
                    );
                }
                // deep copy touches; touches may be recycled on next touchmove event
                previousTouches = [];
                for (var i = 0, len = touches.length; i < len; i++) {
                    previousTouches.push({ pageX: touches[i].pageX, pageY: touches[i].pageY });
                }
            })
            ;
        return $view;
    }
    return this;
}).apply(this.little || {});
