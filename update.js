let _t = 0;
function updateSync(root) {
	_t++;
	root._update();
}

async function update(root) {
	updateSync(root);
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

Element.prototype._update = function() {
	this.update();

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
		child._update();
	}
};

Element.prototype.update = function() {};

Element.prototype.child = function(tagName, key) {
	key = String(key);

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

function b(tagName, key, ...children) {
	return (parent) => {
		const self = parent.child(tagName, key);
		for (const child of children) {
			if (typeof child === "function") {
				child(self);
			} else {
				self.textContent = child;
			}
		}
	};
}
