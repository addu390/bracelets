
(function ($) {

	$.widget("ui.droppable", {

		_init: function () {

			var o = this.options, accept = o.accept;
			this.isover = 0; this.isout = 1;

			this.options.accept = this.options.accept && $.isFunction(this.options.accept) ? this.options.accept : function (d) {
				return d.is(accept);
			};


			this.proportions = { width: this.element[0].offsetWidth, height: this.element[0].offsetHeight };


			$.ui.ddmanager.droppables[this.options.scope] = $.ui.ddmanager.droppables[this.options.scope] || [];
			$.ui.ddmanager.droppables[this.options.scope].push(this);

			(this.options.addClasses && this.element.addClass("ui-droppable"));

		},

		destroy: function () {
			var drop = $.ui.ddmanager.droppables[this.options.scope];
			for (var i = 0; i < drop.length; i++)
				if (drop[i] == this)
					drop.splice(i, 1);

			this.element
				.removeClass("ui-droppable ui-droppable-disabled")
				.removeData("droppable")
				.unbind(".droppable");
		},

		_setData: function (key, value) {

			if (key == 'accept') {
				this.options.accept = value && $.isFunction(value) ? value : function (d) {
					return d.is(value);
				};
			} else {
				$.widget.prototype._setData.apply(this, arguments);
			}

		},

		_activate: function (event) {
			var draggable = $.ui.ddmanager.current;
			if (this.options.activeClass) this.element.addClass(this.options.activeClass);
			(draggable && this._trigger('activate', event, this.ui(draggable)));
		},

		_deactivate: function (event) {
			var draggable = $.ui.ddmanager.current;
			if (this.options.activeClass) this.element.removeClass(this.options.activeClass);
			(draggable && this._trigger('deactivate', event, this.ui(draggable)));
		},

		_over: function (event) {

			var draggable = $.ui.ddmanager.current;
			if (!draggable || (draggable.currentItem || draggable.element)[0] == this.element[0]) return;

			if (this.options.accept.call(this.element[0], (draggable.currentItem || draggable.element))) {
				if (this.options.hoverClass) this.element.addClass(this.options.hoverClass);
				this._trigger('over', event, this.ui(draggable));
			}

		},

		_out: function (event) {

			var draggable = $.ui.ddmanager.current;
			if (!draggable || (draggable.currentItem || draggable.element)[0] == this.element[0]) return;

			if (this.options.accept.call(this.element[0], (draggable.currentItem || draggable.element))) {
				if (this.options.hoverClass) this.element.removeClass(this.options.hoverClass);
				this._trigger('out', event, this.ui(draggable));
			}

		},

		_drop: function (event, custom) {

			var draggable = custom || $.ui.ddmanager.current;
			if (!draggable || (draggable.currentItem || draggable.element)[0] == this.element[0]) return false;

			var childrenIntersection = false;
			this.element.find(":data(droppable)").not(".ui-draggable-dragging").each(function () {
				var inst = $.data(this, 'droppable');
				if (inst.options.greedy && $.ui.intersect(draggable, $.extend(inst, { offset: inst.element.offset() }), inst.options.tolerance)) {
					childrenIntersection = true; return false;
				}
			});

			if (childrenIntersection) return false;

			if (this.options.accept.call(this.element[0], (draggable.currentItem || draggable.element))) {
				if (this.options.activeClass) this.element.removeClass(this.options.activeClass);
				if (this.options.hoverClass) this.element.removeClass(this.options.hoverClass);
				this._trigger('drop', event, this.ui(draggable));
				return this.element;
			}

			return false;

		},

		ui: function (c) {
			return {
				draggable: (c.currentItem || c.element),
				helper: c.helper,
				position: c.position,
				absolutePosition: c.positionAbs,
				offset: c.positionAbs
			};
		}

	});

	$.extend($.ui.droppable, {
		version: "1.7.2",
		eventPrefix: 'drop',
		defaults: {
			accept: '*',
			activeClass: false,
			addClasses: true,
			greedy: false,
			hoverClass: false,
			scope: 'default',
			tolerance: 'intersect'
		}
	});

	$.ui.intersect = function (draggable, droppable, toleranceMode) {

		if (!droppable.offset) return false;

		var x1 = (draggable.positionAbs || draggable.position.absolute).left, x2 = x1 + draggable.helperProportions.width,
			y1 = (draggable.positionAbs || draggable.position.absolute).top, y2 = y1 + draggable.helperProportions.height;
		var l = droppable.offset.left, r = l + droppable.proportions.width,
			t = droppable.offset.top, b = t + droppable.proportions.height;

		switch (toleranceMode) {
			case 'fit':
				return (l < x1 && x2 < r
					&& t < y1 && y2 < b);
				break;
			case 'intersect':
				return (l < x1 + (draggable.helperProportions.width / 2)
					&& x2 - (draggable.helperProportions.width / 2) < r
					&& t < y1 + (draggable.helperProportions.height / 2)
					&& y2 - (draggable.helperProportions.height / 2) < b);
				break;
			case 'pointer':
				var draggableLeft = ((draggable.positionAbs || draggable.position.absolute).left + (draggable.clickOffset || draggable.offset.click).left),
					draggableTop = ((draggable.positionAbs || draggable.position.absolute).top + (draggable.clickOffset || draggable.offset.click).top),
					isOver = $.ui.isOver(draggableTop, draggableLeft, t, l, droppable.proportions.height, droppable.proportions.width);
				return isOver;
				break;
			case 'touch':
				return (
					(y1 >= t && y1 <= b) ||
					(y2 >= t && y2 <= b) ||
					(y1 < t && y2 > b)
				) && (
						(x1 >= l && x1 <= r) ||
						(x2 >= l && x2 <= r) ||
						(x1 < l && x2 > r)
					);
				break;
			default:
				return false;
				break;
		}

	};


	$.ui.ddmanager = {
		current: null,
		droppables: { 'default': [] },
		prepareOffsets: function (t, event) {

			var m = $.ui.ddmanager.droppables[t.options.scope];
			var type = event ? event.type : null;
			var list = (t.currentItem || t.element).find(":data(droppable)").andSelf();

			droppablesLoop: for (var i = 0; i < m.length; i++) {

				if (m[i].options.disabled || (t && !m[i].options.accept.call(m[i].element[0], (t.currentItem || t.element)))) continue;
				for (var j = 0; j < list.length; j++) { if (list[j] == m[i].element[0]) { m[i].proportions.height = 0; continue droppablesLoop; } };
				m[i].visible = m[i].element.css("display") != "none"; if (!m[i].visible) continue;

				m[i].offset = m[i].element.offset();
				m[i].proportions = { width: m[i].element[0].offsetWidth, height: m[i].element[0].offsetHeight };

				if (type == "mousedown") m[i]._activate.call(m[i], event);

			}

		},
		drop: function (draggable, event) {
			var dropped = false;
			$.each($.ui.ddmanager.droppables[draggable.options.scope], function () {

				if (!this.options) return;
				if (!this.options.disabled && this.visible && $.ui.intersect(draggable, this, this.options.tolerance))
					dropped = this._drop.call(this, event);

				if (!this.options.disabled && this.visible && this.options.accept.call(this.element[0], (draggable.currentItem || draggable.element))) {
					this.isout = 1; this.isover = 0;
					this._deactivate.call(this, event);
				}

			});
			return dropped;

		},
		drag: function (draggable, event) {


			if (draggable.options.refreshPositions) $.ui.ddmanager.prepareOffsets(draggable, event);



			$.each($.ui.ddmanager.droppables[draggable.options.scope], function () {

				if (this.options.disabled || this.greedyChild || !this.visible) return;
				var intersects = $.ui.intersect(draggable, this, this.options.tolerance);

				var c = !intersects && this.isover == 1 ? 'isout' : (intersects && this.isover == 0 ? 'isover' : null);
				if (!c) return;

				var parentInstance;
				if (this.options.greedy) {
					var parent = this.element.parents(':data(droppable):eq(0)');
					if (parent.length) {
						parentInstance = $.data(parent[0], 'droppable');
						parentInstance.greedyChild = (c == 'isover' ? 1 : 0);
					}
				}


				if (parentInstance && c == 'isover') {
					parentInstance['isover'] = 0;
					parentInstance['isout'] = 1;
					parentInstance._out.call(parentInstance, event);
				}

				this[c] = 1; this[c == 'isout' ? 'isover' : 'isout'] = 0;
				this[c == "isover" ? "_over" : "_out"].call(this, event);


				if (parentInstance && c == 'isout') {
					parentInstance['isout'] = 0;
					parentInstance['isover'] = 1;
					parentInstance._over.call(parentInstance, event);
				}
			});

		}
	};

})(jQuery);
