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

        this.zoom = function (rate, centerX, centerY) {
            var offset = $content.offset();
            var zoom = $content.data('zoom') * rate;
            centerX = typeof(centerX) === 'number' ? centerX : $container.width() / 2;
            centerY = typeof(centerY) === 'number' ? centerY : $container.height() / 2;
            $content
                .data('zoom', zoom)
                .attr('data-zoom', zoom)
                .css('transform', 'scale(' + zoom + ')')
                .offset({
                    left: (offset.left - centerX) * rate + centerX,
                    top:  (offset.top  - centerY) * rate + centerY,
                });
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

        var mousedown = false;
        var previousMouse = null;
        var previousTouches = null;
        $(window).on('mouseup', function (e) { mousedown = false; });
        $container
            .on('dragstart', function (e) { e.preventDefault(); })
            .on('mousedown', function (e) { previousMouse = e; mousedown = true; })
            .on('mousemove', function (e) {
                if (mousedown) {
                    e.preventDefault();
                    $content.offset({
                        left: $content.offset().left + e.pageX - previousMouse.pageX,
                        top:  $content.offset().top  + e.pageY - previousMouse.pageY,
                    });
                }
                previousMouse = e;
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
            .on('touchmove', function (e) {
                e.preventDefault();
                var touches = e.originalEvent.touches;
                if (touches && previousTouches) {
                    if (touches.length >= 1 && previousTouches.length >= 1) {
                        $content.offset({
                            left: $content.offset().left + touches[0].pageX - previousTouches[0].pageX,
                            top:  $content.offset().top  + touches[0].pageY - previousTouches[0].pageY,
                        });
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
            })
            ;
    }
    return this;
}).apply(this.little || {});
