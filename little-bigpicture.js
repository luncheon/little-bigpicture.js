var little = (function () {
    'use strict';

    this.BigPicture = function (element) {
        var self = this;

        this.setupText = function (element) {
            var $text = $(element);
            return $text
                .css('fontSize', $text.data('size') + 'px')
                .offset({
                    left: $text.data('x'),
                    top:  $text.data('y'),
                })
                .on('blur', function (e) { $(this).text() || $(this).remove(); });
        }

        var $container = $('<div>')
            .addClass('little-bigpicture-container')
            .insertBefore(element);

        var $content = $(element);
        $content.find('.text').each(function () { self.setupText(this) });
        $content
            .addClass('little-bigpicture-content')
            .offset({
                left: -$content.data('x'),
                top:  -$content.data('y'),
            })
            .css('transform', 'scale(' + $content.data('zoom') + ')')
            .appendTo($container);

        // todo: rename variables and functions to more understandable.
        var setZoom = function (zoom, left, top) {
            $content
                .data('zoom', zoom)
                .attr('data-zoom', zoom)
                .css('transform', 'scale(' + zoom + ')')
                .offset({ left: left, top: top });
        }

        this.move = function (offsetX, offsetY) {
            beforeShowBiggest = null;
            $content.offset({
                left: $content.offset().left + offsetX,
                top:  $content.offset().top  + offsetY,
            });
            return this;
        }

        this.zoom = function (rate, centerX, centerY) {
            beforeShowBiggest = null;
            centerX = typeof(centerX) === 'number' ? centerX : $container.width() / 2;
            centerY = typeof(centerY) === 'number' ? centerY : $container.height() / 2;
            setZoom(
                $content.data('zoom') * rate,
                ($content.offset().left - centerX) * rate + centerX,
                ($content.offset().top  - centerY) * rate + centerY
            );
            return this;
        }

        this.create = function (pageX, pageY) {
            var offset = $content.offset();
            var zoom = $content.data('zoom');
            var $text = $('<div>')
                .addClass('text')
                .attr({
                    'contentEditable': true,
                    'data-size': 20 / zoom,
                    'data-x': (pageX - offset.left) / zoom,
                    'data-y': (pageY - offset.top)  / zoom,
                });
            self.setupText($text);
            return $text.appendTo($content).focus();
        }

        var beforeShowBiggest = null;
        this.showBiggest = function () {
            var left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
            $content.find('.text').each(function () {
                var $text = $(this);
                left   = Math.min(left,   $text.data('x'));
                top    = Math.min(top,    $text.data('y'));
                right  = Math.max(right,  $text.data('x') + $text.width());
                bottom = Math.max(bottom, $text.data('y') + $text.height());
            });
            beforeShowBiggest = { offset: $content.offset(), zoom: $content.data('zoom') };
            var zoom = Math.min($container.width() / (right - left), $container.height() / (bottom - top)) * 0.9;
            setZoom(
                zoom,
                -((left + right) * zoom - $container.width())  / 2,
                -((top + bottom) * zoom - $container.height()) / 2
            );
            return this;
        }

        this.toggleBiggest = function () {
            if (beforeShowBiggest) {
                setZoom(beforeShowBiggest.zoom, beforeShowBiggest.offset.left, beforeShowBiggest.offset.top);
                beforeShowBiggest = null;
            } else {
                this.showBiggest();
            }
            return this;
        }

        var mousedown = false;
        var previousMouse = null;
        var previousTouches = null;
        var touchmoved = false;
        $(window).on('mouseup', function (e) { mousedown = false; });
        $container
            .on('dragstart', function (e) { e.preventDefault(); })
            .on('mousedown', function (e) { previousMouse = e; mousedown = true; })
            .on('mousemove', function (e) {
                if (mousedown && ((e.pageX - previousMouse.pageX) || (e.pageY - previousMouse.pageY))) {
                    e.preventDefault();
                    self.move(e.pageX - previousMouse.pageX, e.pageY - previousMouse.pageY);
                    previousMouse = e;
                }
            })
            .on('click', function (e) {
                // ignore drag and drop
                if (previousMouse && previousMouse.type !== 'mousedown') {
                    return;
                }
                // edit existing
                if ($(e.target).hasClass('text')) {
                    return;
                }
                self.create(e.pageX, e.pageY);
            })
            .on('wheel', function (e) {
                e.preventDefault();
                self.zoom(
                    e.originalEvent.deltaY < 0 ? 1.6 : 0.625,
                    previousMouse && previousMouse.pageX,
                    previousMouse && previousMouse.pageY
                );
            })
            .on('gesturestart', function (e) { e.preventDefault(); })
            .on('touchstart', function (e) {
                touchmoved = false;
            })
            .on('touchmove', function (e) {
                touchmoved = true;
                e.preventDefault();
                var touches = e.originalEvent.touches;
                if (touches && previousTouches) {
                    if (touches.length >= 1 && previousTouches.length >= 1) {
                        self.move(touches[0].pageX - previousTouches[0].pageX, touches[0].pageY - previousTouches[0].pageY);
                    }
                    if (touches.length >= 2 && previousTouches.length >= 2) {
                        self.zoom(
                            Math.sqrt(Math.pow(touches[0].pageX - touches[1].pageX, 2) + Math.pow(touches[0].pageY - touches[1].pageY, 2)) /
                            Math.sqrt(Math.pow(previousTouches[0].pageX - previousTouches[1].pageX, 2) + Math.pow(previousTouches[0].pageY - previousTouches[1].pageY, 2)),
                            (touches[0].pageX + touches[1].pageX) / 2,
                            (touches[0].pageY + touches[1].pageY) / 2
                        );
                    }
                }
                // deep copy touches; touches may be recycled on next touchmove event
                previousTouches = [];
                for (var i = 0, len = touches.length; i < len; i++) {
                    previousTouches.push({ pageX: touches[i].pageX, pageY: touches[i].pageY });
                }
            })
            .on('touchend', function (e) {
                e.preventDefault();
                previousTouches = null;
                var touches = e.originalEvent.changedTouches;
                if (!touchmoved && touches.length === 1) {
                    // click (unmoved touch)
                    self.create(touches[0].pageX, touches[0].pageY);
                }
            })
            ;
    }
    return this;
}).apply(this.little || {});
