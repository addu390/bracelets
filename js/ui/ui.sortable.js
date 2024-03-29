
(function ($) {

	$.widget("ui.sortable", $.extend({}, $.ui.mouse, {
		_init: function () {

			var o = this.options;
			this.containerCache = {};
			this.element.addClass("ui-sortable");


			this.refresh();


			this.floating = this.items.length ? (/left|right/).test(this.items[0].item.css('float')) : false;


			this.offset = this.element.offset();


			this._mouseInit();

		},

		destroy: function () {
			this.element
				.removeClass("ui-sortable ui-sortable-disabled")
				.removeData("sortable")
				.unbind(".sortable");
			this._mouseDestroy();

			for (var i = this.items.length - 1; i >= 0; i--)
				this.items[i].item.removeData("sortable-item");
		},

		_mouseCapture: function (event, overrideHandle) {

			if (this.reverting) {
				return false;
			}

			if (this.options.disabled || this.options.type == 'static') return false;


			this._refreshItems(event);


			var currentItem = null, self = this, nodes = $(event.target).parents().each(function () {
				if ($.data(this, 'sortable-item') == self) {
					currentItem = $(this);
					return false;
				}
			});
			if ($.data(event.target, 'sortable-item') == self) currentItem = $(event.target);

			if (!currentItem) return false;
			if (this.options.handle && !overrideHandle) {
				var validHandle = false;

				$(this.options.handle, currentItem).find("*").andSelf().each(function () { if (this == event.target) validHandle = true; });
				if (!validHandle) return false;
			}

			this.currentItem = currentItem;
			this._removeCurrentsFromItems();
			return true;

		},

		_mouseStart: function (event, overrideHandle, noActivation) {

			var o = this.options, self = this;
			this.currentContainer = this;


			this.refreshPositions();


			this.helper = this._createHelper(event);


			this._cacheHelperProportions();




			this._cacheMargins();


			this.scrollParent = this.helper.scrollParent();


			this.offset = this.currentItem.offset();
			this.offset = {
				top: this.offset.top - this.margins.top,
				left: this.offset.left - this.margins.left
			};



			this.helper.css("position", "absolute");
			this.cssPosition = this.helper.css("position");

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


			this.domPosition = { prev: this.currentItem.prev()[0], parent: this.currentItem.parent()[0] };


			if (this.helper[0] != this.currentItem[0]) {
				this.currentItem.hide();
			}


			this._createPlaceholder();


			if (o.containment)
				this._setContainment();

			if (o.cursor) {
				if ($('body').css("cursor")) this._storedCursor = $('body').css("cursor");
				$('body').css("cursor", o.cursor);
			}

			if (o.opacity) {
				if (this.helper.css("opacity")) this._storedOpacity = this.helper.css("opacity");
				this.helper.css("opacity", o.opacity);
			}

			if (o.zIndex) {
				if (this.helper.css("zIndex")) this._storedZIndex = this.helper.css("zIndex");
				this.helper.css("zIndex", o.zIndex);
			}


			if (this.scrollParent[0] != document && this.scrollParent[0].tagName != 'HTML')
				this.overflowOffset = this.scrollParent.offset();


			this._trigger("start", event, this._uiHash());


			if (!this._preserveHelperProportions)
				this._cacheHelperProportions();



			if (!noActivation) {
				for (var i = this.containers.length - 1; i >= 0; i--) { this.containers[i]._trigger("activate", event, self._uiHash(this)); }
			}


			if ($.ui.ddmanager)
				$.ui.ddmanager.current = this;

			if ($.ui.ddmanager && !o.dropBehaviour)
				$.ui.ddmanager.prepareOffsets(this, event);

			this.dragging = true;

			this.helper.addClass("ui-sortable-helper");
			this._mouseDrag(event);
			return true;

		},

		_mouseDrag: function (event) {


			this.position = this._generatePosition(event);
			this.positionAbs = this._convertPositionTo("absolute");

			if (!this.lastPositionAbs) {
				this.lastPositionAbs = this.positionAbs;
			}


			if (this.options.scroll) {
				var o = this.options, scrolled = false;
				if (this.scrollParent[0] != document && this.scrollParent[0].tagName != 'HTML') {

					if ((this.overflowOffset.top + this.scrollParent[0].offsetHeight) - event.pageY < o.scrollSensitivity)
						this.scrollParent[0].scrollTop = scrolled = this.scrollParent[0].scrollTop + o.scrollSpeed;
					else if (event.pageY - this.overflowOffset.top < o.scrollSensitivity)
						this.scrollParent[0].scrollTop = scrolled = this.scrollParent[0].scrollTop - o.scrollSpeed;

					if ((this.overflowOffset.left + this.scrollParent[0].offsetWidth) - event.pageX < o.scrollSensitivity)
						this.scrollParent[0].scrollLeft = scrolled = this.scrollParent[0].scrollLeft + o.scrollSpeed;
					else if (event.pageX - this.overflowOffset.left < o.scrollSensitivity)
						this.scrollParent[0].scrollLeft = scrolled = this.scrollParent[0].scrollLeft - o.scrollSpeed;

				} else {

					if (event.pageY - $(document).scrollTop() < o.scrollSensitivity)
						scrolled = $(document).scrollTop($(document).scrollTop() - o.scrollSpeed);
					else if ($(window).height() - (event.pageY - $(document).scrollTop()) < o.scrollSensitivity)
						scrolled = $(document).scrollTop($(document).scrollTop() + o.scrollSpeed);

					if (event.pageX - $(document).scrollLeft() < o.scrollSensitivity)
						scrolled = $(document).scrollLeft($(document).scrollLeft() - o.scrollSpeed);
					else if ($(window).width() - (event.pageX - $(document).scrollLeft()) < o.scrollSensitivity)
						scrolled = $(document).scrollLeft($(document).scrollLeft() + o.scrollSpeed);

				}

				if (scrolled !== false && $.ui.ddmanager && !o.dropBehaviour)
					$.ui.ddmanager.prepareOffsets(this, event);
			}


			this.positionAbs = this._convertPositionTo("absolute");


			if (!this.options.axis || this.options.axis != "y") this.helper[0].style.left = this.position.left + 'px';
			if (!this.options.axis || this.options.axis != "x") this.helper[0].style.top = this.position.top + 'px';


			for (var i = this.items.length - 1; i >= 0; i--) {


				var item = this.items[i], itemElement = item.item[0], intersection = this._intersectsWithPointer(item);
				if (!intersection) continue;

				if (itemElement != this.currentItem[0]
					&& this.placeholder[intersection == 1 ? "next" : "prev"]()[0] != itemElement
					&& !$.ui.contains(this.placeholder[0], itemElement)
					&& (this.options.type == 'semi-dynamic' ? !$.ui.contains(this.element[0], itemElement) : true)
				) {

					this.direction = intersection == 1 ? "down" : "up";

					if (this.options.tolerance == "pointer" || this._intersectsWithSides(item)) {
						this._rearrange(event, item);
					} else {
						break;
					}

					this._trigger("change", event, this._uiHash());
					break;
				}
			}


			this._contactContainers(event);


			if ($.ui.ddmanager) $.ui.ddmanager.drag(this, event);


			this._trigger('sort', event, this._uiHash());

			this.lastPositionAbs = this.positionAbs;
			return false;

		},

		_mouseStop: function (event, noPropagation) {

			if (!event) return;


			if ($.ui.ddmanager && !this.options.dropBehaviour)
				$.ui.ddmanager.drop(this, event);

			if (this.options.revert) {
				var self = this;
				var cur = self.placeholder.offset();

				self.reverting = true;

				$(this.helper).animate({
					left: cur.left - this.offset.parent.left - self.margins.left + (this.offsetParent[0] == document.body ? 0 : this.offsetParent[0].scrollLeft),
					top: cur.top - this.offset.parent.top - self.margins.top + (this.offsetParent[0] == document.body ? 0 : this.offsetParent[0].scrollTop)
				}, parseInt(this.options.revert, 10) || 500, function () {
					self._clear(event);
				});
			} else {
				this._clear(event, noPropagation);
			}

			return false;

		},

		cancel: function () {

			var self = this;

			if (this.dragging) {

				this._mouseUp();

				if (this.options.helper == "original")
					this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper");
				else
					this.currentItem.show();


				for (var i = this.containers.length - 1; i >= 0; i--) {
					this.containers[i]._trigger("deactivate", null, self._uiHash(this));
					if (this.containers[i].containerCache.over) {
						this.containers[i]._trigger("out", null, self._uiHash(this));
						this.containers[i].containerCache.over = 0;
					}
				}

			}


			if (this.placeholder[0].parentNode) this.placeholder[0].parentNode.removeChild(this.placeholder[0]);
			if (this.options.helper != "original" && this.helper && this.helper[0].parentNode) this.helper.remove();

			$.extend(this, {
				helper: null,
				dragging: false,
				reverting: false,
				_noFinalSort: null
			});

			if (this.domPosition.prev) {
				$(this.domPosition.prev).after(this.currentItem);
			} else {
				$(this.domPosition.parent).prepend(this.currentItem);
			}

			return true;

		},

		serialize: function (o) {

			var items = this._getItemsAsjQuery(o && o.connected);
			var str = []; o = o || {};

			$(items).each(function () {
				var res = ($(o.item || this).attr(o.attribute || 'id') || '').match(o.expression || (/(.+)[-=_](.+)/));
				if (res) str.push((o.key || res[1] + '[]') + '=' + (o.key && o.expression ? res[1] : res[2]));
			});

			return str.join('&');

		},

		toArray: function (o) {

			var items = this._getItemsAsjQuery(o && o.connected);
			var ret = []; o = o || {};

			items.each(function () { ret.push($(o.item || this).attr(o.attribute || 'id') || ''); });
			return ret;

		},


		_intersectsWith: function (item) {

			var x1 = this.positionAbs.left,
				x2 = x1 + this.helperProportions.width,
				y1 = this.positionAbs.top,
				y2 = y1 + this.helperProportions.height;

			var l = item.left,
				r = l + item.width,
				t = item.top,
				b = t + item.height;

			var dyClick = this.offset.click.top,
				dxClick = this.offset.click.left;

			var isOverElement = (y1 + dyClick) > t && (y1 + dyClick) < b && (x1 + dxClick) > l && (x1 + dxClick) < r;

			if (this.options.tolerance == "pointer"
				|| this.options.forcePointerForContainers
				|| (this.options.tolerance != "pointer" && this.helperProportions[this.floating ? 'width' : 'height'] > item[this.floating ? 'width' : 'height'])
			) {
				return isOverElement;
			} else {

				return (l < x1 + (this.helperProportions.width / 2)
					&& x2 - (this.helperProportions.width / 2) < r
					&& t < y1 + (this.helperProportions.height / 2)
					&& y2 - (this.helperProportions.height / 2) < b);

			}
		},

		_intersectsWithPointer: function (item) {

			var isOverElementHeight = $.ui.isOverAxis(this.positionAbs.top + this.offset.click.top, item.top, item.height),
				isOverElementWidth = $.ui.isOverAxis(this.positionAbs.left + this.offset.click.left, item.left, item.width),
				isOverElement = isOverElementHeight && isOverElementWidth,
				verticalDirection = this._getDragVerticalDirection(),
				horizontalDirection = this._getDragHorizontalDirection();

			if (!isOverElement)
				return false;

			return this.floating ?
				(((horizontalDirection && horizontalDirection == "right") || verticalDirection == "down") ? 2 : 1)
				: (verticalDirection && (verticalDirection == "down" ? 2 : 1));

		},

		_intersectsWithSides: function (item) {

			var isOverBottomHalf = $.ui.isOverAxis(this.positionAbs.top + this.offset.click.top, item.top + (item.height / 2), item.height),
				isOverRightHalf = $.ui.isOverAxis(this.positionAbs.left + this.offset.click.left, item.left + (item.width / 2), item.width),
				verticalDirection = this._getDragVerticalDirection(),
				horizontalDirection = this._getDragHorizontalDirection();

			if (this.floating && horizontalDirection) {
				return ((horizontalDirection == "right" && isOverRightHalf) || (horizontalDirection == "left" && !isOverRightHalf));
			} else {
				return verticalDirection && ((verticalDirection == "down" && isOverBottomHalf) || (verticalDirection == "up" && !isOverBottomHalf));
			}

		},

		_getDragVerticalDirection: function () {
			var delta = this.positionAbs.top - this.lastPositionAbs.top;
			return delta != 0 && (delta > 0 ? "down" : "up");
		},

		_getDragHorizontalDirection: function () {
			var delta = this.positionAbs.left - this.lastPositionAbs.left;
			return delta != 0 && (delta > 0 ? "right" : "left");
		},

		refresh: function (event) {
			this._refreshItems(event);
			this.refreshPositions();
		},

		_connectWith: function () {
			var options = this.options;
			return options.connectWith.constructor == String
				? [options.connectWith]
				: options.connectWith;
		},

		_getItemsAsjQuery: function (connected) {

			var self = this;
			var items = [];
			var queries = [];
			var connectWith = this._connectWith();

			if (connectWith && connected) {
				for (var i = connectWith.length - 1; i >= 0; i--) {
					var cur = $(connectWith[i]);
					for (var j = cur.length - 1; j >= 0; j--) {
						var inst = $.data(cur[j], 'sortable');
						if (inst && inst != this && !inst.options.disabled) {
							queries.push([$.isFunction(inst.options.items) ? inst.options.items.call(inst.element) : $(inst.options.items, inst.element).not(".ui-sortable-helper"), inst]);
						}
					};
				};
			}

			queries.push([$.isFunction(this.options.items) ? this.options.items.call(this.element, null, { options: this.options, item: this.currentItem }) : $(this.options.items, this.element).not(".ui-sortable-helper"), this]);

			for (var i = queries.length - 1; i >= 0; i--) {
				queries[i][0].each(function () {
					items.push(this);
				});
			};

			return $(items);

		},

		_removeCurrentsFromItems: function () {

			var list = this.currentItem.find(":data(sortable-item)");

			for (var i = 0; i < this.items.length; i++) {

				for (var j = 0; j < list.length; j++) {
					if (list[j] == this.items[i].item[0])
						this.items.splice(i, 1);
				};

			};

		},

		_refreshItems: function (event) {

			this.items = [];
			this.containers = [this];
			var items = this.items;
			var self = this;
			var queries = [[$.isFunction(this.options.items) ? this.options.items.call(this.element[0], event, { item: this.currentItem }) : $(this.options.items, this.element), this]];
			var connectWith = this._connectWith();

			if (connectWith) {
				for (var i = connectWith.length - 1; i >= 0; i--) {
					var cur = $(connectWith[i]);
					for (var j = cur.length - 1; j >= 0; j--) {
						var inst = $.data(cur[j], 'sortable');
						if (inst && inst != this && !inst.options.disabled) {
							queries.push([$.isFunction(inst.options.items) ? inst.options.items.call(inst.element[0], event, { item: this.currentItem }) : $(inst.options.items, inst.element), inst]);
							this.containers.push(inst);
						}
					};
				};
			}

			for (var i = queries.length - 1; i >= 0; i--) {
				var targetData = queries[i][1];
				var _queries = queries[i][0];

				for (var j = 0, queriesLength = _queries.length; j < queriesLength; j++) {
					var item = $(_queries[j]);

					item.data('sortable-item', targetData);

					items.push({
						item: item,
						instance: targetData,
						width: 0, height: 0,
						left: 0, top: 0
					});
				};
			};

		},

		refreshPositions: function (fast) {


			if (this.offsetParent && this.helper) {
				this.offset.parent = this._getParentOffset();
			}

			for (var i = this.items.length - 1; i >= 0; i--) {
				var item = this.items[i];


				if (item.instance != this.currentContainer && this.currentContainer && item.item[0] != this.currentItem[0])
					continue;

				var t = this.options.toleranceElement ? $(this.options.toleranceElement, item.item) : item.item;

				if (!fast) {
					item.width = t.outerWidth();
					item.height = t.outerHeight();
				}

				var p = t.offset();
				item.left = p.left;
				item.top = p.top;
			};

			if (this.options.custom && this.options.custom.refreshContainers) {
				this.options.custom.refreshContainers.call(this);
			} else {
				for (var i = this.containers.length - 1; i >= 0; i--) {
					var p = this.containers[i].element.offset();
					this.containers[i].containerCache.left = p.left;
					this.containers[i].containerCache.top = p.top;
					this.containers[i].containerCache.width = this.containers[i].element.outerWidth();
					this.containers[i].containerCache.height = this.containers[i].element.outerHeight();
				};
			}

		},

		_createPlaceholder: function (that) {

			var self = that || this, o = self.options;

			if (!o.placeholder || o.placeholder.constructor == String) {
				var className = o.placeholder;
				o.placeholder = {
					element: function () {

						var el = $(document.createElement(self.currentItem[0].nodeName))
							.addClass(className || self.currentItem[0].className + " ui-sortable-placeholder")
							.removeClass("ui-sortable-helper")[0];

						if (!className)
							el.style.margin = "0px";
							el.style.padding = "0px";
							el.style.visibility = "hidden";

						return el;
					},
					update: function (container, p) {



						if (className && !o.forcePlaceholderSize) return;


						if (!p.height()) { p.height(self.currentItem.innerHeight() - parseInt(self.currentItem.css('paddingTop') || 0, 10) - parseInt(self.currentItem.css('paddingBottom') || 0, 10)); };
						if (!p.width()) { p.width(self.currentItem.innerWidth() - parseInt(self.currentItem.css('paddingLeft') || 0, 10) - parseInt(self.currentItem.css('paddingRight') || 0, 10)); };
					}
				};
			}


			self.placeholder = $(o.placeholder.element.call(self.element, self.currentItem));


			self.currentItem.after(self.placeholder);


			o.placeholder.update(self, self.placeholder);

		},

		_contactContainers: function (event) {
			for (var i = this.containers.length - 1; i >= 0; i--) {

				if (this._intersectsWith(this.containers[i].containerCache)) {
					if (!this.containers[i].containerCache.over) {

						if (this.currentContainer != this.containers[i]) {


							var dist = 10000; var itemWithLeastDistance = null; var base = this.positionAbs[this.containers[i].floating ? 'left' : 'top'];
							for (var j = this.items.length - 1; j >= 0; j--) {
								if (!$.ui.contains(this.containers[i].element[0], this.items[j].item[0])) continue;
								var cur = this.items[j][this.containers[i].floating ? 'left' : 'top'];
								if (Math.abs(cur - base) < dist) {
									dist = Math.abs(cur - base); itemWithLeastDistance = this.items[j];
								}
							}

							if (!itemWithLeastDistance && !this.options.dropOnEmpty)
								continue;

							this.currentContainer = this.containers[i];
							itemWithLeastDistance ? this._rearrange(event, itemWithLeastDistance, null, true) : this._rearrange(event, null, this.containers[i].element, true);
							this._trigger("change", event, this._uiHash());
							this.containers[i]._trigger("change", event, this._uiHash(this));


							this.options.placeholder.update(this.currentContainer, this.placeholder);

						}

						this.containers[i]._trigger("over", event, this._uiHash(this));
						this.containers[i].containerCache.over = 1;
					}
				} else {
					if (this.containers[i].containerCache.over) {
						this.containers[i]._trigger("out", event, this._uiHash(this));
						this.containers[i].containerCache.over = 0;
					}
				}

			};
		},

		_createHelper: function (event) {

			var o = this.options;
			var helper = $.isFunction(o.helper) ? $(o.helper.apply(this.element[0], [event, this.currentItem])) : (o.helper == 'clone' ? this.currentItem.clone() : this.currentItem);

			if (!helper.parents('body').length)
				$(o.appendTo != 'parent' ? o.appendTo : this.currentItem[0].parentNode)[0].appendChild(helper[0]);

			if (helper[0] == this.currentItem[0])
				this._storedCSS = { width: this.currentItem[0].style.width, height: this.currentItem[0].style.height, position: this.currentItem.css("position"), top: this.currentItem.css("top"), left: this.currentItem.css("left") };

			if (helper[0].style.width == '' || o.forceHelperSize) helper.width(this.currentItem.width());
			if (helper[0].style.height == '' || o.forceHelperSize) helper.height(this.currentItem.height());

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
				var p = this.currentItem.position();
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
				left: (parseInt(this.currentItem.css("marginLeft"), 10) || 0),
				top: (parseInt(this.currentItem.css("marginTop"), 10) || 0)
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

			if (!(/^(document|window|parent)$/).test(o.containment)) {
				var ce = $(o.containment)[0];
				var co = $(o.containment).offset();
				var over = ($(ce).css("overflow") != 'hidden');

				this.containment = [
					co.left + (parseInt($(ce).css("borderLeftWidth"), 10) || 0) + (parseInt($(ce).css("paddingLeft"), 10) || 0) - this.margins.left,
					co.top + (parseInt($(ce).css("borderTopWidth"), 10) || 0) + (parseInt($(ce).css("paddingTop"), 10) || 0) - this.margins.top,
					co.left + (over ? Math.max(ce.scrollWidth, ce.offsetWidth) : ce.offsetWidth) - (parseInt($(ce).css("borderLeftWidth"), 10) || 0) - (parseInt($(ce).css("paddingRight"), 10) || 0) - this.helperProportions.width - this.margins.left,
					co.top + (over ? Math.max(ce.scrollHeight, ce.offsetHeight) : ce.offsetHeight) - (parseInt($(ce).css("borderTopWidth"), 10) || 0) - (parseInt($(ce).css("paddingBottom"), 10) || 0) - this.helperProportions.height - this.margins.top
				];
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

		_rearrange: function (event, i, a, hardRefresh) {

			a ? a[0].appendChild(this.placeholder[0]) : i.item[0].parentNode.insertBefore(this.placeholder[0], (this.direction == 'down' ? i.item[0] : i.item[0].nextSibling));






			this.counter = this.counter ? ++this.counter : 1;
			var self = this, counter = this.counter;

			window.setTimeout(function () {
				if (counter == self.counter) self.refreshPositions(!hardRefresh);
			}, 0);

		},

		_clear: function (event, noPropagation) {

			this.reverting = false;


			var delayedTriggers = [], self = this;



			if (!this._noFinalSort && this.currentItem[0].parentNode) this.placeholder.before(this.currentItem);
			this._noFinalSort = null;

			if (this.helper[0] == this.currentItem[0]) {
				for (var i in this._storedCSS) {
					if (this._storedCSS[i] == 'auto' || this._storedCSS[i] == 'static') this._storedCSS[i] = '';
				}
				this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper");
			} else {
				this.currentItem.show();
			}

			if (this.fromOutside && !noPropagation) delayedTriggers.push(function (event) { this._trigger("receive", event, this._uiHash(this.fromOutside)); });
			if ((this.fromOutside || this.domPosition.prev != this.currentItem.prev().not(".ui-sortable-helper")[0] || this.domPosition.parent != this.currentItem.parent()[0]) && !noPropagation) delayedTriggers.push(function (event) { this._trigger("update", event, this._uiHash()); });
			if (!$.ui.contains(this.element[0], this.currentItem[0])) {
				if (!noPropagation) delayedTriggers.push(function (event) { this._trigger("remove", event, this._uiHash()); });
				for (var i = this.containers.length - 1; i >= 0; i--) {
					if ($.ui.contains(this.containers[i].element[0], this.currentItem[0]) && !noPropagation) {
						delayedTriggers.push((function (c) { return function (event) { c._trigger("receive", event, this._uiHash(this)); }; }).call(this, this.containers[i]));
						delayedTriggers.push((function (c) { return function (event) { c._trigger("update", event, this._uiHash(this)); }; }).call(this, this.containers[i]));
					}
				};
			};


			for (var i = this.containers.length - 1; i >= 0; i--) {
				if (!noPropagation) delayedTriggers.push((function (c) { return function (event) { c._trigger("deactivate", event, this._uiHash(this)); }; }).call(this, this.containers[i]));
				if (this.containers[i].containerCache.over) {
					delayedTriggers.push((function (c) { return function (event) { c._trigger("out", event, this._uiHash(this)); }; }).call(this, this.containers[i]));
					this.containers[i].containerCache.over = 0;
				}
			}


			if (this._storedCursor) $('body').css("cursor", this._storedCursor);
			if (this._storedOpacity) this.helper.css("opacity", this._storedOpacity);
			if (this._storedZIndex) this.helper.css("zIndex", this._storedZIndex == 'auto' ? '' : this._storedZIndex);

			this.dragging = false;
			if (this.cancelHelperRemoval) {
				if (!noPropagation) {
					this._trigger("beforeStop", event, this._uiHash());
					for (var i = 0; i < delayedTriggers.length; i++) { delayedTriggers[i].call(this, event); };
					this._trigger("stop", event, this._uiHash());
				}
				return false;
			}

			if (!noPropagation) this._trigger("beforeStop", event, this._uiHash());


			this.placeholder[0].parentNode.removeChild(this.placeholder[0]);

			if (this.helper[0] != this.currentItem[0]) this.helper.remove(); this.helper = null;

			if (!noPropagation) {
				for (var i = 0; i < delayedTriggers.length; i++) { delayedTriggers[i].call(this, event); };
				this._trigger("stop", event, this._uiHash());
			}

			this.fromOutside = false;
			return true;

		},

		_trigger: function () {
			if ($.widget.prototype._trigger.apply(this, arguments) === false) {
				this.cancel();
			}
		},

		_uiHash: function (inst) {
			var self = inst || this;
			return {
				helper: self.helper,
				placeholder: self.placeholder || $([]),
				position: self.position,
				absolutePosition: self.positionAbs,
				offset: self.positionAbs,
				item: self.currentItem,
				sender: inst ? inst.element : null
			};
		}

	}));

	$.extend($.ui.sortable, {
		getter: "serialize toArray",
		version: "1.7.2",
		eventPrefix: "sort",
		defaults: {
			appendTo: "parent",
			axis: false,
			cancel: ":input,option",
			connectWith: false,
			containment: false,
			cursor: 'auto',
			cursorAt: false,
			delay: 0,
			distance: 1,
			dropOnEmpty: true,
			forcePlaceholderSize: false,
			forceHelperSize: false,
			grid: false,
			handle: false,
			helper: "original",
			items: '> *',
			opacity: false,
			placeholder: false,
			revert: false,
			scroll: true,
			scrollSensitivity: 20,
			scrollSpeed: 20,
			scope: "default",
			tolerance: "intersect",
			zIndex: 1000
		}
	});

})(jQuery);
