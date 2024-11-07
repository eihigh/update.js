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

let _t = 1;
let _willCleanup = false;
const _depths = new Map();

async function _cleanup() {
	// collect elements with the minimum depth
	let minDepth = Infinity;
	let minDepthElems = [];
	for (const elem of _depths.keys()) {
		const depth = _depths.get(elem);
		if (depth < minDepth) {
			minDepth = depth;
			minDepthElems = [elem];
		} else if (depth === minDepth) {
			minDepthElems.push(elem);
		}
	}
	// cleanup elements recursively
	for (const elem of minDepthElems) {
		_cleanupElem(elem);
	}
	_willCleanup = false;
	_depths.clear();
	_t++;
}

function _cleanupElem(elem) {
	if (elem._tHasDynamicChildren === _t) {
		// remove elements and text nodes
		let child = elem.firstChild;
		while (child != null) {
			if (child._t === _t) {
				// keep new child
				child = child.nextSibling;
				continue;
			}
			if (child.nodeType === Node.ELEMENT_NODE && !child.hasAttribute("key")) {
				// keep unkeyed element
				child = child.nextSibling;
				continue;
			}
			// remove outdated child
			const outdated = child;
			child = child.nextSibling;
			elem._removeChild(outdated);
		}
	} else {
		// remove elements
		let child = elem.firstElementChild;
		while (child != null) {
			if (child._t === _t) {
				// keep new child
				child = child.nextElementSibling;
				continue;
			}
			if (!child.hasAttribute("key")) {
				// keep unkeyed element
				child = child.nextElementSibling;
				continue;
			}
			// remove outdated child
			const outdated = child;
			child = child.nextElementSibling;
			elem._removeChild(outdated);
		}
	}

	let child = elem.firstElementChild;
	while (child != null) {
		_cleanupElem(child); // recursive
		child = child.nextElementSibling;
	}
}

Element.prototype.keyed = function(tagName, key) {
	this._tHasDynamicChildren = _t;

	// request cleanup
	if (!_willCleanup) {
		_willCleanup = true;
		queueMicrotask(_cleanup);
	}

	// cache the depth of this element
	if (!_depths.has(this)) {
		let depth = 0;
		let parent = this.parentElement;
		while (parent != null) {
			depth++;
			parent = parent.parentElement;
		}
		_depths.set(this, depth);
	}

	// collect keys of server-rendered children
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

	// auto key generation
	if (key == null) {
		// initialize or clear tag counts
		if (this._tagCounts == null) {
			this._tTagCounts = _t;
			this._tagCounts = new Map();
		} else if (this._tTagCounts !== _t) {
			this._tTagCounts = _t;
			this._tagCounts.clear();
		}
		// generate key
		const tagCount = this._tagCounts.get(tagName) || 0;
		key = `auto ${tagName} ${tagCount}`;
		this._tagCounts.set(tagName, tagCount + 1);
	} else if (typeof key !== "string") {
		key = key.toString();
	}

	// initialize cursor
	if (this._tCursor !== _t) {
		this._tCursor = _t;
		this._cursor = this.firstElementChild;
	}

	// return existing child
	if (this._keys.has(key)) {
		const child = this._keys.get(key);
		child._t = _t;

		// skip to the next keyed element
		while (this._cursor != null) {
			if (this._cursor.nodeType === Node.ELEMENT_NODE && this._cursor.hasAttribute("key")) {
				break;
			}
			this._cursor = this._cursor.nextElementSibling;
		}

		// insert child after the cursor
		if (this._cursor !== child) {
			const next = this._cursor == null ? null : this._cursor.nextSibling;
			this._insertBefore(child, next);
		}

		// move the cursor to the next of the child
		this._cursor = child.nextSibling;

		return child;
	}

	// create new child
	const child = document.createElement(tagName);
	child._t = _t;
	child.setAttribute("key", key);
	this._keys.set(key, child);

	// insert child after the cursor
	const next = this._cursor == null ? null : this._cursor.nextSibling;
	this._insertBefore(child, next);

	// move the cursor to the next of the child
	if (next != null) {
		this._cursor = child.nextSibling;
	}

	return child;
};

Element.prototype.insertText = function(text) {
	this._tHasDynamicChildren = _t;

	if (this._cursor.nodeType === Node.TEXT_NODE && this._cursor._t == null) {
		this._cursor.textContent = text;
		this._cursor._t = _t;
		this._cursor = this._cursor.nextSibling;
		return;
	}

	// create new child
	const node = document.createTextNode(text);
	node._t = _t;

	// insert child after the cursor
	const next = this._cursor == null ? null : this._cursor.nextSibling;
	this._insertBefore(node, next);

	// move the cursor to the next of the child
	if (next != null) {
		this._cursor = node.nextSibling;
	}
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
			return (parent) => type(parent, props, ...children);
		}
		return (parent) => {
			const elem = parent.keyed(type, props ? props.key : null);
			_applyProps(elem, props);
			if (children.length === 0) {
				// fast path for text-only children
				elem.textContent = children[0];
			} else {
				_applyChildren(elem, ...children);
			}
		};
	},
};
