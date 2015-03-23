var little = (function () {
    'use strict';

    this.bigpicture = function (element) {
        var $container = $('<div>')
            .addClass('little-bigpicture-container')
            .insertBefore(element);

        var $view = $.extend($(element), {
            scale: function (scale) {
                if (scale === void 0) {
                    return this.data('scale');
                } else {
                    return this.data('scale', scale).attr('data-scale', scale).css('transform', 'scale(' + scale + ')').trigger('scale', scale);
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
            moving: function (moving) {
                if (moving === void 0) {
                    return this.data('moving');
                } else {
                    return this.data('moving', moving).attr('data-moving', moving);
                }
            },
            move: function (distanceX, distanceY) {
                if (this.moving() === 'view') {
                    $view.x($view.x() - distanceX).y($view.y() - distanceY);
                } else if (this.moving() === 'text') {
                    var $text = $('.text:focus');
                    $text.offset({ left: $text.offset().left + distanceX, top: $text.offset().top + distanceY });
                }
            },
            text: {
                create: function (pageX, pageY) {
                    var $text = $('<div>').addClass('text')
                        .attr({
                            'contentEditable': true,
                            'data-size': 20 / $view.scale(),
                            'data-x': (pageX + $view.x()) / $view.scale(),
                            'data-y': (pageY + $view.y()) / $view.scale(),
                        });
                    return this.setup($text).appendTo($view).focus();
                },
                setup: function (element) {
                    var $text = $(element);
                    return $text
                        .css('fontSize', $text.data('size') + 'px')
                        .offset({ left: $text.data('x'), top: $text.data('y') })
                        .on('keydown', function (e) { e.keyCode === 27 && this.blur(); })   // blur on Esc
                        .on('blur', function (e) { $(this).text() || $(this).remove(); });
                },
                size: function (element, size) {
                    if (size === void 0) {
                        return $(element).data('size');
                    } else {
                        return $(element).data('size', size).attr('data-size', size).css('fontSize', size + 'px');
                    }
                },
            },
            biggest: {
                previous: null,
                rectangle: function () {
                    var left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
                    $view.find('.text').each(function () {
                        var $text = $(this);
                        left   = Math.min(left,   $text.data('x'));
                        top    = Math.min(top,    $text.data('y'));
                        right  = Math.max(right,  $text.data('x') + $text.width());
                        bottom = Math.max(bottom, $text.data('y') + $text.height());
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

        $view.find('.text').each(function () { $view.text.setup(this) });
        $view.addClass('little-bigpicture-content')
             .scale($view.data('scale') || 1)
             .x($view.data('x'))
             .y($view.data('y'))
             .on('scale offset', function (e) { $view.biggest.previous = null; })
             .appendTo($container);

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
                    $view.move(e.pageX - previousMouse.pageX, e.pageY - previousMouse.pageY);
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
                $view.text.create(e.pageX, e.pageY);
            })
            .on('wheel', function (e) {
                e.preventDefault();
                $view.focusingScale(
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
                        $view.move(touches[0].pageX - previousTouches[0].pageX, touches[0].pageY - previousTouches[0].pageY);
                    }
                    if (touches.length >= 2 && previousTouches.length >= 2) {
                        $view.focusingScale(
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
                if (!touchmoved && touches.length === 1 && !$(e.target).hasClass('text')) {
                    // touch and unmoved: click
                    $view.text.create(touches[0].pageX, touches[0].pageY);
                }
            })
            ;
        return $view;
    }
    return this;
}).apply(this.little || {});
