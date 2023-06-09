
(function ($) {

	$.widget("ui.draggable", $.extend({}, $.ui.mouse, {

		_init: function () {

			if (this.options.helper == 'original' && !(/^(?:r|a|f)/).test(this.element.css("position")))
				this.element[0].style.position = 'relative';

			(this.options.addClasses && this.element.addClass("ui-draggable"));
			(this.options.disabled && this.element.addClass("ui-draggable-disabled"));

			this._mouseInit();

		},

		destroy: function () {
			if (!this.element.data('draggable')) return;
			this.element
				.removeData("draggable")
				.unbind(".draggable")
				.removeClass("ui-draggable"
					+ " ui-draggable-dragging"
					+ " ui-draggable-disabled");
			this._mouseDestroy();
		},

		_mouseCapture: function (event) {

			var o = this.options;

			if (this.helper || o.disabled || $(event.target).is('.ui-resizable-handle'))
				return false;


			this.handle = this._getHandle(event);
			if (!this.handle)
				return false;

			return true;

		},

		_mouseStart: function (event) {

			var o = this.options;


			this.helper = this._createHelper(event);


			this._cacheHelperProportions();


			if ($.ui.ddmanager)
				$.ui.ddmanager.current = this;




			this._cacheMargins();


			this.cssPosition = this.helper.css("position");
			this.scrollParent = this.helper.scrollParent();


			this.offset = this.element.offset();
			this.offset = {
				top: this.offset.top - this.margins.top,
				left: this.offset.left - this.margins.left
			};

			$.extend(this.offset, {
				click: {
					left: event.pageX - this.offset.left,
					top: event.pageY - this.offset.top
				},
				parent: this._getParentOffset(),
				relative: this._getRelativeOffset()
			});


			this.originalPosition = this._generatePosition(event);
			this.originalPageX = event.pageX;
			this.originalPageY = event.pageY;


			if (o.cursorAt)
				this._adjustOffsetFromHelper(o.cursorAt);


			if (o.containment)
				this._setContainment();


			this._trigger("start", event);


			this._cacheHelperProportions();


			if ($.ui.ddmanager && !o.dropBehaviour)
				$.ui.ddmanager.prepareOffsets(this, event);

			this.helper.addClass("ui-draggable-dragging");
			this._mouseDrag(event, true);
			return true;
		},

		_mouseDrag: function (event, noPropagation) {


			this.position = this._generatePosition(event);
			this.positionAbs = this._convertPositionTo("absolute");


			if (!noPropagation) {
				var ui = this._uiHash();
				this._trigger('drag', event, ui);
				this.position = ui.position;
			}

			if (!this.options.axis || this.options.axis != "y") this.helper[0].style.left = this.position.left + 'px';
			if (!this.options.axis || this.options.axis != "x") this.helper[0].style.top = this.position.top + 'px';
			if ($.ui.ddmanager) $.ui.ddmanager.drag(this, event);

			return false;
		},

		_mouseStop: function (event) {


			var dropped = false;
			if ($.ui.ddmanager && !this.options.dropBehaviour)
				dropped = $.ui.ddmanager.drop(this, event);


			if (this.dropped) {
				dropped = this.dropped;
				this.dropped = false;
			}

			if ((this.options.revert == "invalid" && !dropped) || (this.options.revert == "valid" && dropped) || this.options.revert === true || ($.isFunction(this.options.revert) && this.options.revert.call(this.element, dropped))) {
				var self = this;
				$(this.helper).animate(this.originalPosition, parseInt(this.options.revertDuration, 10), function () {
					self._trigger("stop", event);
					self._clear();
				});
			} else {
				this._trigger("stop", event);
				this._clear();
			}

			return false;
		},

		_getHandle: function (event) {

			var handle = !this.options.handle || !$(this.options.handle, this.element).length ? true : false;
			$(this.options.handle, this.element)
				.find("*")
				.andSelf()
				.each(function () {
					if (this == event.target) handle = true;
				});

			return handle;

		},

		_createHelper: function (event) {

			var o = this.options;
			var helper = $.isFunction(o.helper) ? $(o.helper.apply(this.element[0], [event])) : (o.helper == 'clone' ? this.element.clone() : this.element);

			if (!helper.parents('body').length)
				helper.appendTo((o.appendTo == 'parent' ? this.element[0].parentNode : o.appendTo));

			if (helper[0] != this.element[0] && !(/(fixed|absolute)/).test(helper.css("position")))
				helper.css("position", "absolute");

			return helper;

		},

		_adjustOffsetFromHelper: function (obj) {
			if (obj.left != undefined) this.offset.click.left = obj.left + this.margins.left;
			if (obj.right != undefined) this.offset.click.left = this.helperProportions.width - obj.right + this.margins.left;
			if (obj.top != undefined) this.offset.click.top = obj.top + this.margins.top;
			if (obj.bottom != undefined) this.offset.click.top = this.helperProportions.height - obj.bottom + this.margins.top;
		},

		_getParentOffset: function () {


			this.offsetParent = this.helper.offsetParent();
			var po = this.offsetParent.offset();





			if (this.cssPosition == 'absolute' && this.scrollParent[0] != document && $.ui.contains(this.scrollParent[0], this.offsetParent[0])) {
				po.left += this.scrollParent.scrollLeft();
				po.top += this.scrollParent.scrollTop();
			}

			if ((this.offsetParent[0] == document.body)
				|| (this.offsetParent[0].tagName && this.offsetParent[0].tagName.toLowerCase() == 'html' && $.browser.msie))
				po = { top: 0, left: 0 };

			return {
				top: po.top + (parseInt(this.offsetParent.css("borderTopWidth"), 10) || 0),
				left: po.left + (parseInt(this.offsetParent.css("borderLeftWidth"), 10) || 0)
			};

		},

		_getRelativeOffset: function () {

			if (this.cssPosition == "relative") {
				var p = this.element.position();
				return {
					top: p.top - (parseInt(this.helper.css("top"), 10) || 0) + this.scrollParent.scrollTop(),
					left: p.left - (parseInt(this.helper.css("left"), 10) || 0) + this.scrollParent.scrollLeft()
				};
			} else {
				return { top: 0, left: 0 };
			}

		},

		_cacheMargins: function () {
			this.margins = {
				left: (parseInt(this.element.css("marginLeft"), 10) || 0),
				top: (parseInt(this.element.css("marginTop"), 10) || 0)
			};
		},

		_cacheHelperProportions: function () {
			this.helperProportions = {
				width: this.helper.outerWidth(),
				height: this.helper.outerHeight()
			};
		},

		_setContainment: function () {

			var o = this.options;
			if (o.containment == 'parent') o.containment = this.helper[0].parentNode;
			if (o.containment == 'document' || o.containment == 'window') this.containment = [
				0 - this.offset.relative.left - this.offset.parent.left,
				0 - this.offset.relative.top - this.offset.parent.top,
				$(o.containment == 'document' ? document : window).width() - this.helperProportions.width - this.margins.left,
				($(o.containment == 'document' ? document : window).height() || document.body.parentNode.scrollHeight) - this.helperProportions.height - this.margins.top
			];

			if (!(/^(document|window|parent)$/).test(o.containment) && o.containment.constructor != Array) {
				var ce = $(o.containment)[0]; if (!ce) return;
				var co = $(o.containment).offset();
				var over = ($(ce).css("overflow") != 'hidden');

				this.containment = [
					co.left + (parseInt($(ce).css("borderLeftWidth"), 10) || 0) + (parseInt($(ce).css("paddingLeft"), 10) || 0) - this.margins.left,
					co.top + (parseInt($(ce).css("borderTopWidth"), 10) || 0) + (parseInt($(ce).css("paddingTop"), 10) || 0) - this.margins.top,
					co.left + (over ? Math.max(ce.scrollWidth, ce.offsetWidth) : ce.offsetWidth) - (parseInt($(ce).css("borderLeftWidth"), 10) || 0) - (parseInt($(ce).css("paddingRight"), 10) || 0) - this.helperProportions.width - this.margins.left,
					co.top + (over ? Math.max(ce.scrollHeight, ce.offsetHeight) : ce.offsetHeight) - (parseInt($(ce).css("borderTopWidth"), 10) || 0) - (parseInt($(ce).css("paddingBottom"), 10) || 0) - this.helperProportions.height - this.margins.top
				];
			} else if (o.containment.constructor == Array) {
				this.containment = o.containment;
			}

		},

		_convertPositionTo: function (d, pos) {

			if (!pos) pos = this.position;
			var mod = d == "absolute" ? 1 : -1;
			var o = this.options, scroll = this.cssPosition == 'absolute' && !(this.scrollParent[0] != document && $.ui.contains(this.scrollParent[0], this.offsetParent[0])) ? this.offsetParent : this.scrollParent, scrollIsRootNode = (/(html|body)/i).test(scroll[0].tagName);

			return {
				top: (
					pos.top
					+ this.offset.relative.top * mod
					+ this.offset.parent.top * mod
					- ($.browser.safari && this.cssPosition == 'fixed' ? 0 : (this.cssPosition == 'fixed' ? -this.scrollParent.scrollTop() : (scrollIsRootNode ? 0 : scroll.scrollTop())) * mod)
				),
				left: (
					pos.left
					+ this.offset.relative.left * mod
					+ this.offset.parent.left * mod
					- ($.browser.safari && this.cssPosition == 'fixed' ? 0 : (this.cssPosition == 'fixed' ? -this.scrollParent.scrollLeft() : scrollIsRootNode ? 0 : scroll.scrollLeft()) * mod)
				)
			};

		},

		_generatePosition: function (event) {

			var o = this.options, scroll = this.cssPosition == 'absolute' && !(this.scrollParent[0] != document && $.ui.contains(this.scrollParent[0], this.offsetParent[0])) ? this.offsetParent : this.scrollParent, scrollIsRootNode = (/(html|body)/i).test(scroll[0].tagName);





			if (this.cssPosition == 'relative' && !(this.scrollParent[0] != document && this.scrollParent[0] != this.offsetParent[0])) {
				this.offset.relative = this._getRelativeOffset();
			}

			var pageX = event.pageX;
			var pageY = event.pageY;



			if (this.originalPosition) {

				if (this.containment) {
					if (event.pageX - this.offset.click.left < this.containment[0]) pageX = this.containment[0] + this.offset.click.left;
					if (event.pageY - this.offset.click.top < this.containment[1]) pageY = this.containment[1] + this.offset.click.top;
					if (event.pageX - this.offset.click.left > this.containment[2]) pageX = this.containment[2] + this.offset.click.left;
					if (event.pageY - this.offset.click.top > this.containment[3]) pageY = this.containment[3] + this.offset.click.top;
				}

				if (o.grid) {
					var top = this.originalPageY + Math.round((pageY - this.originalPageY) / o.grid[1]) * o.grid[1];
					pageY = this.containment ? (!(top - this.offset.click.top < this.containment[1] || top - this.offset.click.top > this.containment[3]) ? top : (!(top - this.offset.click.top < this.containment[1]) ? top - o.grid[1] : top + o.grid[1])) : top;

					var left = this.originalPageX + Math.round((pageX - this.originalPageX) / o.grid[0]) * o.grid[0];
					pageX = this.containment ? (!(left - this.offset.click.left < this.containment[0] || left - this.offset.click.left > this.containment[2]) ? left : (!(left - this.offset.click.left < this.containment[0]) ? left - o.grid[0] : left + o.grid[0])) : left;
				}

			}

			return {
				top: (
					pageY
					- this.offset.click.top
					- this.offset.relative.top
					- this.offset.parent.top
					+ ($.browser.safari && this.cssPosition == 'fixed' ? 0 : (this.cssPosition == 'fixed' ? -this.scrollParent.scrollTop() : (scrollIsRootNode ? 0 : scroll.scrollTop())))
				),
				left: (
					pageX
					- this.offset.click.left
					- this.offset.relative.left
					- this.offset.parent.left
					+ ($.browser.safari && this.cssPosition == 'fixed' ? 0 : (this.cssPosition == 'fixed' ? -this.scrollParent.scrollLeft() : scrollIsRootNode ? 0 : scroll.scrollLeft()))
				)
			};

		},

		_clear: function () {
			this.helper.removeClass("ui-draggable-dragging");
			if (this.helper[0] != this.element[0] && !this.cancelHelperRemoval) this.helper.remove();

			this.helper = null;
			this.cancelHelperRemoval = false;
		},



		_trigger: function (type, event, ui) {
			ui = ui || this._uiHash();
			$.ui.plugin.call(this, type, [event, ui]);
			if (type == "drag") this.positionAbs = this._convertPositionTo("absolute");
			return $.widget.prototype._trigger.call(this, type, event, ui);
		},

		plugins: {},

		_uiHash: function (event) {
			return {
				helper: this.helper,
				position: this.position,
				absolutePosition: this.positionAbs,
				offset: this.positionAbs
			};
		}

	}));

	$.extend($.ui.draggable, {
		version: "1.7.2",
		eventPrefix: "drag",
		defaults: {
			addClasses: true,
			appendTo: "parent",
			axis: false,
			cancel: ":input,option",
			connectToSortable: false,
			containment: false,
			cursor: "auto",
			cursorAt: false,
			delay: 0,
			distance: 1,
			grid: false,
			handle: false,
			helper: "original",
			iframeFix: false,
			opacity: false,
			refreshPositions: false,
			revert: false,
			revertDuration: 500,
			scope: "default",
			scroll: true,
			scrollSensitivity: 20,
			scrollSpeed: 20,
			snap: false,
			snapMode: "both",
			snapTolerance: 20,
			stack: false,
			zIndex: false
		}
	});

	$.ui.plugin.add("draggable", "connectToSortable", {
		start: function (event, ui) {

			var inst = $(this).data("draggable"), o = inst.options,
				uiSortable = $.extend({}, ui, { item: inst.element });
			inst.sortables = [];
			$(o.connectToSortable).each(function () {
				var sortable = $.data(this, 'sortable');
				if (sortable && !sortable.options.disabled) {
					inst.sortables.push({
						instance: sortable,
						shouldRevert: sortable.options.revert
					});
					sortable._refreshItems();
					sortable._trigger("activate", event, uiSortable);
				}
			});

		},
		stop: function (event, ui) {


			var inst = $(this).data("draggable"),
				uiSortable = $.extend({}, ui, { item: inst.element });

			$.each(inst.sortables, function () {
				if (this.instance.isOver) {

					this.instance.isOver = 0;

					inst.cancelHelperRemoval = true;
					this.instance.cancelHelperRemoval = false;


					if (this.shouldRevert) this.instance.options.revert = true;


					this.instance._mouseStop(event);

					this.instance.options.helper = this.instance.options._helper;


					if (inst.options.helper == 'original')
						this.instance.currentItem.css({ top: 'auto', left: 'auto' });

				} else {
					this.instance.cancelHelperRemoval = false;
					this.instance._trigger("deactivate", event, uiSortable);
				}

			});

		},
		drag: function (event, ui) {

			var inst = $(this).data("draggable"), self = this;

			var checkPos = function (o) {
				var dyClick = this.offset.click.top, dxClick = this.offset.click.left;
				var helperTop = this.positionAbs.top, helperLeft = this.positionAbs.left;
				var itemHeight = o.height, itemWidth = o.width;
				var itemTop = o.top, itemLeft = o.left;

				return $.ui.isOver(helperTop + dyClick, helperLeft + dxClick, itemTop, itemLeft, itemHeight, itemWidth);
			};

			$.each(inst.sortables, function (i) {


				this.instance.positionAbs = inst.positionAbs;
				this.instance.helperProportions = inst.helperProportions;
				this.instance.offset.click = inst.offset.click;

				if (this.instance._intersectsWith(this.instance.containerCache)) {


					if (!this.instance.isOver) {

						this.instance.isOver = 1;



						this.instance.currentItem = $(self).clone().appendTo(this.instance.element).data("sortable-item", true);
						this.instance.options._helper = this.instance.options.helper;
						this.instance.options.helper = function () { return ui.helper[0]; };

						event.target = this.instance.currentItem[0];
						this.instance._mouseCapture(event, true);
						this.instance._mouseStart(event, true, true);


						this.instance.offset.click.top = inst.offset.click.top;
						this.instance.offset.click.left = inst.offset.click.left;
						this.instance.offset.parent.left -= inst.offset.parent.left - this.instance.offset.parent.left;
						this.instance.offset.parent.top -= inst.offset.parent.top - this.instance.offset.parent.top;

						inst._trigger("toSortable", event);
						inst.dropped = this.instance.element;

						inst.currentItem = inst.element;
						this.instance.fromOutside = inst;

					}


					if (this.instance.currentItem) this.instance._mouseDrag(event);

				} else {



					if (this.instance.isOver) {

						this.instance.isOver = 0;
						this.instance.cancelHelperRemoval = true;


						this.instance.options.revert = false;


						this.instance._trigger('out', event, this.instance._uiHash(this.instance));

						this.instance._mouseStop(event, true);
						this.instance.options.helper = this.instance.options._helper;


						this.instance.currentItem.remove();
						if (this.instance.placeholder) this.instance.placeholder.remove();

						inst._trigger("fromSortable", event);
						inst.dropped = false;
					}

				};

			});

		}
	});

	$.ui.plugin.add("draggable", "cursor", {
		start: function (event, ui) {
			var t = $('body'), o = $(this).data('draggable').options;
			if (t.css("cursor")) o._cursor = t.css("cursor");
			t.css("cursor", o.cursor);
		},
		stop: function (event, ui) {
			var o = $(this).data('draggable').options;
			if (o._cursor) $('body').css("cursor", o._cursor);
		}
	});

	$.ui.plugin.add("draggable", "iframeFix", {
		start: function (event, ui) {
			var o = $(this).data('draggable').options;
			$(o.iframeFix === true ? "iframe" : o.iframeFix).each(function () {
				$('<div class="ui-draggable-iframeFix" style="background: #fff;"></div>')
					.css({
						width: this.offsetWidth + "px", height: this.offsetHeight + "px",
						position: "absolute", opacity: "0.001", zIndex: 1000
					})
					.css($(this).offset())
					.appendTo("body");
			});
		},
		stop: function (event, ui) {
			$("div.ui-draggable-iframeFix").each(function () { this.parentNode.removeChild(this); });
		}
	});

	$.ui.plugin.add("draggable", "opacity", {
		start: function (event, ui) {
			var t = $(ui.helper), o = $(this).data('draggable').options;
			if (t.css("opacity")) o._opacity = t.css("opacity");
			t.css('opacity', o.opacity);
		},
		stop: function (event, ui) {
			var o = $(this).data('draggable').options;
			if (o._opacity) $(ui.helper).css('opacity', o._opacity);
		}
	});

	$.ui.plugin.add("draggable", "scroll", {
		start: function (event, ui) {
			var i = $(this).data("draggable");
			if (i.scrollParent[0] != document && i.scrollParent[0].tagName != 'HTML') i.overflowOffset = i.scrollParent.offset();
		},
		drag: function (event, ui) {

			var i = $(this).data("draggable"), o = i.options, scrolled = false;

			if (i.scrollParent[0] != document && i.scrollParent[0].tagName != 'HTML') {

				if (!o.axis || o.axis != 'x') {
					if ((i.overflowOffset.top + i.scrollParent[0].offsetHeight) - event.pageY < o.scrollSensitivity)
						i.scrollParent[0].scrollTop = scrolled = i.scrollParent[0].scrollTop + o.scrollSpeed;
					else if (event.pageY - i.overflowOffset.top < o.scrollSensitivity)
						i.scrollParent[0].scrollTop = scrolled = i.scrollParent[0].scrollTop - o.scrollSpeed;
				}

				if (!o.axis || o.axis != 'y') {
					if ((i.overflowOffset.left + i.scrollParent[0].offsetWidth) - event.pageX < o.scrollSensitivity)
						i.scrollParent[0].scrollLeft = scrolled = i.scrollParent[0].scrollLeft + o.scrollSpeed;
					else if (event.pageX - i.overflowOffset.left < o.scrollSensitivity)
						i.scrollParent[0].scrollLeft = scrolled = i.scrollParent[0].scrollLeft - o.scrollSpeed;
				}

			} else {

				if (!o.axis || o.axis != 'x') {
					if (event.pageY - $(document).scrollTop() < o.scrollSensitivity)
						scrolled = $(document).scrollTop($(document).scrollTop() - o.scrollSpeed);
					else if ($(window).height() - (event.pageY - $(document).scrollTop()) < o.scrollSensitivity)
						scrolled = $(document).scrollTop($(document).scrollTop() + o.scrollSpeed);
				}

				if (!o.axis || o.axis != 'y') {
					if (event.pageX - $(document).scrollLeft() < o.scrollSensitivity)
						scrolled = $(document).scrollLeft($(document).scrollLeft() - o.scrollSpeed);
					else if ($(window).width() - (event.pageX - $(document).scrollLeft()) < o.scrollSensitivity)
						scrolled = $(document).scrollLeft($(document).scrollLeft() + o.scrollSpeed);
				}

			}

			if (scrolled !== false && $.ui.ddmanager && !o.dropBehaviour)
				$.ui.ddmanager.prepareOffsets(i, event);

		}
	});

	$.ui.plugin.add("draggable", "snap", {
		start: function (event, ui) {

			var i = $(this).data("draggable"), o = i.options;
			i.snapElements = [];

			$(o.snap.constructor != String ? (o.snap.items || ':data(draggable)') : o.snap).each(function () {
				var $t = $(this); var $o = $t.offset();
				if (this != i.element[0]) i.snapElements.push({
					item: this,
					width: $t.outerWidth(), height: $t.outerHeight(),
					top: $o.top, left: $o.left
				});
			});

		},
		drag: function (event, ui) {

			var inst = $(this).data("draggable"), o = inst.options;
			var d = o.snapTolerance;

			var x1 = ui.offset.left, x2 = x1 + inst.helperProportions.width,
				y1 = ui.offset.top, y2 = y1 + inst.helperProportions.height;

			for (var i = inst.snapElements.length - 1; i >= 0; i--) {

				var l = inst.snapElements[i].left, r = l + inst.snapElements[i].width,
					t = inst.snapElements[i].top, b = t + inst.snapElements[i].height;


				if (!((l - d < x1 && x1 < r + d && t - d < y1 && y1 < b + d) || (l - d < x1 && x1 < r + d && t - d < y2 && y2 < b + d) || (l - d < x2 && x2 < r + d && t - d < y1 && y1 < b + d) || (l - d < x2 && x2 < r + d && t - d < y2 && y2 < b + d))) {
					if (inst.snapElements[i].snapping) (inst.options.snap.release && inst.options.snap.release.call(inst.element, event, $.extend(inst._uiHash(), { snapItem: inst.snapElements[i].item })));
					inst.snapElements[i].snapping = false;
					continue;
				}

				if (o.snapMode != 'inner') {
					var ts = Math.abs(t - y2) <= d;
					var bs = Math.abs(b - y1) <= d;
					var ls = Math.abs(l - x2) <= d;
					var rs = Math.abs(r - x1) <= d;
					if (ts) ui.position.top = inst._convertPositionTo("relative", { top: t - inst.helperProportions.height, left: 0 }).top - inst.margins.top;
					if (bs) ui.position.top = inst._convertPositionTo("relative", { top: b, left: 0 }).top - inst.margins.top;
					if (ls) ui.position.left = inst._convertPositionTo("relative", { top: 0, left: l - inst.helperProportions.width }).left - inst.margins.left;
					if (rs) ui.position.left = inst._convertPositionTo("relative", { top: 0, left: r }).left - inst.margins.left;
				}

				var first = (ts || bs || ls || rs);

				if (o.snapMode != 'outer') {
					var ts = Math.abs(t - y1) <= d;
					var bs = Math.abs(b - y2) <= d;
					var ls = Math.abs(l - x1) <= d;
					var rs = Math.abs(r - x2) <= d;
					if (ts) ui.position.top = inst._convertPositionTo("relative", { top: t, left: 0 }).top - inst.margins.top;
					if (bs) ui.position.top = inst._convertPositionTo("relative", { top: b - inst.helperProportions.height, left: 0 }).top - inst.margins.top;
					if (ls) ui.position.left = inst._convertPositionTo("relative", { top: 0, left: l }).left - inst.margins.left;
					if (rs) ui.position.left = inst._convertPositionTo("relative", { top: 0, left: r - inst.helperProportions.width }).left - inst.margins.left;
				}

				if (!inst.snapElements[i].snapping && (ts || bs || ls || rs || first))
					(inst.options.snap.snap && inst.options.snap.snap.call(inst.element, event, $.extend(inst._uiHash(), { snapItem: inst.snapElements[i].item })));
				inst.snapElements[i].snapping = (ts || bs || ls || rs || first);

			};

		}
	});

	$.ui.plugin.add("draggable", "stack", {
		start: function (event, ui) {

			var o = $(this).data("draggable").options;

			var group = $.makeArray($(o.stack.group)).sort(function (a, b) {
				return (parseInt($(a).css("zIndex"), 10) || o.stack.min) - (parseInt($(b).css("zIndex"), 10) || o.stack.min);
			});

			$(group).each(function (i) {
				this.style.zIndex = o.stack.min + i;
			});

			this[0].style.zIndex = o.stack.min + group.length;

		}
	});

	$.ui.plugin.add("draggable", "zIndex", {
		start: function (event, ui) {
			var t = $(ui.helper), o = $(this).data("draggable").options;
			if (t.css("zIndex")) o._zIndex = t.css("zIndex");
			t.css('zIndex', o.zIndex);
		},
		stop: function (event, ui) {
			var o = $(this).data("draggable").options;
			if (o._zIndex) $(ui.helper).css('zIndex', o._zIndex);
		}
	});

})(jQuery);
