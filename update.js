console.log("hoge")

Element.prototype._update = function ()  {
	console.log("update")
	this.update();

	// Update all children
	for (const child of this.children) {
		child._update();
	}
};

Element.prototype.update = function () {};

Element.prototype.child = (constructor, key) => {
};
