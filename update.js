function updateSync(root) {
	this._tParent = this._tParent || 0;
	this._tParent++;
	root._update();
}

async function update(root) {
	updateSync(root);
}

Element.prototype._update = function() {
	this.update();

	for (let i = this.children.length - 1; i >= 0; i--) {
		const child = this.children[i];
		if (child._tChild !== this._tParent) {
			// remove outdated children
			this.removeChild(child);
		}
	}

	for (const child of this.children) {
		child._update();
	}
};

Element.prototype.update = function() {};

Element.prototype.child = function(tagName, key) {
	this._tParent = this._tParent || 0;
	tagName = tagName.toUpperCase();
	key = String(key);

	let found = null;
	for (const child of this.children) {
		if (child.tagName === tagName && child.getAttribute("key") === key) {
			found = child;
			break;
		}
	}

	if (found) {
		// return existing child
		found._tChild = this._tParent;
		return found;
	}

	// create new child
	const child = document.createElement(tagName);
	child._tChild = this._tParent;
	child.setAttribute("key", key);
	this.appendChild(child);
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
