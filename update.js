let _t = 0;
function updateSubtreeSync(root) {
	_t++;
	root._onupdate();
}

async function updateSubtree(root) {
	updateSubtreeSync(root);
}

Node.prototype._appendChild = Node.prototype.appendChild;
Node.prototype.appendChild = function() {
	delete this._keys;
	this._appendChild(...arguments);
}
Node.prototype._insertBefore = Node.prototype.insertBefore;
Node.prototype.insertBefore = function() {
	delete this._keys;
	this._insertBefore(...arguments);
}
Node.prototype._removeChild = Node.prototype.removeChild;
Node.prototype.removeChild = function() {
	delete this._keys;
	this._removeChild(...arguments);
}
Node.prototype._replaceChild = Node.prototype.replaceChild;
Node.prototype.replaceChild = function() {
	delete this._keys;
	this._replaceChild(...arguments);
}

Element.prototype._after = Element.prototype.after;
Element.prototype.after = function() {
	delete this.parentNode._keys;
	this._after(...arguments);
}
Element.prototype._append = Element.prototype.append;
Element.prototype.append = function() {
	delete this._keys;
	this._append(...arguments);
}
Element.prototype._before = Element.prototype.before;
Element.prototype.before = function() {
	delete this.parentNode._keys;
	this._before(...arguments);
}
Element.prototype._prepend = Element.prototype.prepend;
Element.prototype.prepend = function() {
	delete this._keys;
	this._prepend(...arguments);
}
Element.prototype._remove = Element.prototype.remove;
Element.prototype.remove = function() {
	delete this.parentNode._keys;
	this._remove(...arguments);
}
Element.prototype._replaceChildren = Element.prototype.replaceChildren;
Element.prototype.replaceChildren = function() {
	delete this._keys;
	this._replaceChildren(...arguments);
}
Element.prototype._replaceWith = Element.prototype.replaceWith;
Element.prototype.replaceWith = function() {
	delete this.parentNode._keys;
	this._replaceWith(...arguments);
}

Element.prototype._onupdate = function() {
	// this.dispatchEvent(new Event("update"));
	this.onupdate();

	let child = this.firstElementChild;
	while (child != null) {
		if (child._t !== _t) {
			if (child.hasAttribute("key")) {
				// remove outdated children
				if (this._keys != null) {
					this._keys.delete(child.getAttribute("key"));
				}
				const outdated = child;
				child = child.nextElementSibling;
				outdated._remove();
				continue;
			}
		}
		child = child.nextElementSibling;
	}

	child = this.firstElementChild;
	while (child != null) {
		child._onupdate();
		child = child.nextElementSibling;
	}
};

Element.prototype.onupdate = function() {};

Element.prototype.keyed = function(tagName, key) {
	tagName = tagName.toLowerCase();
	if (key == null) {
		// auto key generation
		if (this._tagCounts == null) {
			this._tTagCounts = _t;
			this._tagCounts = new Map();
		} else if (this._tTagCounts !== _t) {
			// clear outdated tag counts
			this._tTagCounts = _t;
			this._tagCounts.clear();
		}
		const tagCount = this._tagCounts.get(tagName) || 0;
		key = `auto ${tagName} ${tagCount}`;
		this._tagCounts.set(tagName, tagCount + 1);
	} else if (typeof key !== "string") {
		key = key.toString();
	}

	if (this._tCursor !== _t) {
		this._tCursor = _t;
		this._cursor = this.firstElementChild;
		while (this._cursor != null) {
			if (this._cursor.hasAttribute("key")) {
				break;
			}
			this._cursor = this._cursor.nextElementSibling;
		}
	}

	if (this._keys == null) {
		this._keys = new Map();
		let child = this.firstElementChild;
		while (child != null) {
			if (child.hasAttribute("key")) {
				this._keys.set(child.getAttribute("key"), child);
			}
			child = child.nextElementSibling;
		}
	}

	if (this._keys.has(key)) {
		// return existing child
		const child = this._keys.get(key);
		child._t = _t;
		if (this._cursor !== child) {
			// insert child after cursor
			const next = this._cursor == null ? null : this._cursor.nextElementSibling;
			this._insertBefore(child, next);
		}
		this._cursor = child.nextElementSibling;
		while (this._cursor != null) {
			if (this._cursor.hasAttribute("key")) {
				break;
			}
			this._cursor = this._cursor.nextElementSibling;
		}
		return child;
	}

	// create new child
	const child = document.createElement(tagName);
	child._t = _t;
	child.setAttribute("key", key);
	this._appendChild(child);
	this._keys.set(key, child);
	return child;
};

Element.prototype.keyedText = function(text, key) {
	this.keyed("span", key).textContent = text;
}

const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;

function setStyle(style, key, value) {
	if (key[0] === '-') {
		style.setProperty(key, value == null ? '' : value);
	} else if (value == null) {
		style[key] = '';
	} else if (typeof value != 'number' || IS_NON_DIMENSIONAL.test(key)) {
		style[key] = value;
	} else {
		style[key] = value + 'px';
	}
}

function _applyProps(elem, props) {
	if (props == null) { return; }

	if (elem._listened == null) {
		elem._listened = new Set();
	}

	for (const key in props) {
		const value = props[key];
		if (key === "key") {
			continue;
		} else if (key === "style") {
			const style = elem.style;
			if (typeof value === "string") {
				style.cssText = value;
			} else {
				for (const key in value) {
					setStyle(style, key, value[key]);
				}
			}
		} else if (key.startsWith("on")) {
			if (key === "onupdate") {
				elem.onupdate = value;
			} else {
				const event = key.slice(2).toLowerCase();
				if (!elem._listened.has(event)) {
					elem.addEventListener(event, value);
				}
				elem._listened.add(event);
			}
		} else if (key in elem) {
			elem[key] = value;
		} else if (value == null) {
			elem.removeAttribute(key);
		} else {
			elem.setAttribute(key, value);
		}
	}
}

function _applyChildren(elem, ...children) {
	for (const child of children) {
		if (typeof child === "function") {
			child(elem);
		} else if (Array.isArray(child)) {
			_applyChildren(elem, ...child);
		} else if (typeof child === "string") {
			// elem.keyedText(child);
			elem.textContent = child;
		} else if (child != null) {
			elem.keyedText(child.toString());
		}
	}
}

const React = {
	createElement: (type, props, ...children) => {
		if (typeof type === "function") {
			return type(props, ...children);
		}
		return (parent) => {
			const elem = parent.keyed(type, props ? props.key : null);
			_applyProps(elem, props);
			if (children.length === 1 && typeof children[0] === "string") {
				// fast path for text-only children
				elem.textContent = children[0];
			} else {
				_applyChildren(elem, ...children);
			}
		};
	},
};
