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
	this.dispatchEvent(new Event("update"));

	for (let i = this.children.length - 1; i >= 0; i--) {
		const child = this.children[i];
		if (child.hasAttribute("key") && child._t !== _t) {
			// remove outdated children
			if (this._keys != null) {
				this._keys.delete(child.getAttribute("key"));
			}
			this._removeChild(child);
		}
	}

	for (const child of this.children) {
		child._onupdate();
	}
};

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

	if (this._keys == null) {
		this._keys = new Map();
		for (const child of this.children) {
			if (child.hasAttribute("key")) {
				this._keys.set(child.getAttribute("key"), child);
			}
		}
	}

	if (this._keys.has(key)) {
		// return existing child
		const child = this._keys.get(key);
		child._t = _t;
		this._appendChild(child);
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
			const event = key.slice(2).toLowerCase();
			if (!elem._listened.has(event)) {
				elem.addEventListener(event, value);
			}
			elem._listened.add(event);
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
			_applyChildren(elem, ...children);
		};
	},
};
