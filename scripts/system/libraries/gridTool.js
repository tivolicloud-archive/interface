/* global keyUpEventFromUIWindow */

var GRID_CONTROLS_HTML_URL = Script.resolvePath("../html/gridControls.html");

Grid = function () {
	var that = {};
	var gridColor = { red: 55, green: 55, blue: 55 };
	var gridAlpha = 0.5;
	var origin = {
		x: 0,
		y: +MyAvatar.getJointPosition("LeftToeBase").y.toFixed(1) + 0.1,
		z: 0
	};
	var scale = 500;
	var minorGridEvery = 1.0;
	var majorGridEvery = 5;
	var halfSize = 40;

	var worldSize = 16384;

	var snapToGrid = false;

	var gridOverlay = Overlays.addOverlay("grid", {
		rotation: Quat.fromPitchYawRollDegrees(90, 0, 0),
		dimensions: { x: scale, y: scale, z: scale },
		position: origin,
		visible: false,
		drawInFront: true,
		color: gridColor,
		alpha: gridAlpha,
		minorGridEvery: minorGridEvery,
		majorGridEvery: majorGridEvery,
		ignorePickIntersection: true
	});

	that.visible = false;
	that.enabled = false;

	that.getOrigin = function () {
		return origin;
	};

	that.getMinorIncrement = function () {
		return minorGridEvery;
	};

	that.setMinorIncrement = function (value) {
		minorGridEvery = value;
		updateGrid();
	};

	that.getMajorIncrement = function () {
		return majorGridEvery;
	};

	that.setMajorIncrement = function (value) {
		majorGridEvery = value;
		updateGrid();
	};

	that.getColor = function () {
		return gridColor;
	};

	that.setColor = function (value) {
		gridColor = value;
		updateGrid();
	};

	that.getSnapToGrid = function () {
		return snapToGrid;
	};
	that.setSnapToGrid = function (value) {
		snapToGrid = value;
		that.emitUpdate();
	};

	that.setEnabled = function (enabled) {
		that.enabled = enabled;
		updateGrid();
	};

	that.getVisible = function () {
		return that.visible;
	};
	that.setVisible = function (visible, noUpdate) {
		that.visible = visible;
		updateGrid();

		if (!noUpdate) {
			that.emitUpdate();
		}
	};

	that.snapToSurface = function (position, dimensions, registration) {
		if (!snapToGrid) {
			return position;
		}

		if (dimensions === undefined) {
			dimensions = { x: 0, y: 0, z: 0 };
		}

		if (registration === undefined) {
			registration = { x: 0.5, y: 0.5, z: 0.5 };
		}

		return {
			x: position.x,
			y: origin.y + registration.y * dimensions.y,
			z: position.z
		};
	};

	that.snapToGrid = function (position, majorOnly, dimensions, registration) {
		if (!snapToGrid) {
			return position;
		}

		if (dimensions === undefined) {
			dimensions = { x: 0, y: 0, z: 0 };
		}

		if (registration === undefined) {
			registration = { x: 0.5, y: 0.5, z: 0.5 };
		}

		var spacing = majorOnly ? majorGridEvery : minorGridEvery;

		position = Vec3.subtract(position, origin);

		position.x = Math.round(position.x / spacing) * spacing;
		position.y = Math.round(position.y / spacing) * spacing;
		position.z = Math.round(position.z / spacing) * spacing;

		return Vec3.sum(
			Vec3.sum(position, Vec3.multiplyVbyV(registration, dimensions)),
			origin
		);
	};

	that.snapToSpacing = function (delta, majorOnly) {
		if (!snapToGrid) {
			return delta;
		}

		var spacing = majorOnly ? majorGridEvery : minorGridEvery;

		var snappedDelta = {
			x: Math.round(delta.x / spacing) * spacing,
			y: Math.round(delta.y / spacing) * spacing,
			z: Math.round(delta.z / spacing) * spacing
		};

		return snappedDelta;
	};

	that.setPosition = function (newPosition, noUpdate) {
		origin = { x: 0, y: newPosition.y, z: 0 };
		updateGrid();

		if (!noUpdate) {
			that.emitUpdate();
		}
	};

	that.moveToSelection = function () {
		var newPosition = SelectionManager.worldPosition;
		newPosition = Vec3.subtract(newPosition, {
			x: 0,
			y: SelectionManager.worldDimensions.y * 0.5,
			z: 0
		});
		that.setPosition(newPosition);
	};

	that.emitUpdate = function () {
		if (that.onUpdate) {
			that.onUpdate({
				origin: origin,
				minorGridEvery: minorGridEvery,
				majorGridEvery: majorGridEvery,
				gridSize: halfSize,
				visible: that.visible,
				snapToGrid: snapToGrid
			});
		}
	};

	that.update = function (data) {
		if (data.snapToGrid !== undefined) {
			snapToGrid = data.snapToGrid;
		}

		if (data.origin) {
			var pos = data.origin;
			pos.x = pos.x === undefined ? origin.x : parseFloat(pos.x);
			pos.y = pos.y === undefined ? origin.y : parseFloat(pos.y);
			pos.z = pos.z === undefined ? origin.z : parseFloat(pos.z);
			that.setPosition(pos, true);
		}

		if (data.minorGridEvery) {
			minorGridEvery = data.minorGridEvery;
		}

		if (data.majorGridEvery) {
			majorGridEvery = data.majorGridEvery;
		}

		if (data.gridColor) {
			gridColor = data.gridColor;
		}

		if (data.gridSize) {
			halfSize = data.gridSize;
		}

		if (data.visible !== undefined) {
			that.setVisible(data.visible, true);
		}

		updateGrid(true);
	};

	function updateGrid(noUpdate) {
		Overlays.editOverlay(gridOverlay, {
			position: { x: 0, y: origin.y, z: 0 },
			visible: that.visible && that.enabled,
			minorGridEvery: minorGridEvery,
			majorGridEvery: majorGridEvery,
			color: gridColor,
			alpha: gridAlpha
		});

		if (!noUpdate) {
			that.emitUpdate();
		}
	}

	function cleanup() {
		Overlays.deleteOverlay(gridOverlay);
	}

	that.addListener = function (callback) {
		that.onUpdate = callback;
	};

	Script.scriptEnding.connect(cleanup);
	updateGrid();

	that.onUpdate = null;

	return that;
};

GridTool = function (opts) {
	var that = {};

	var horizontalGrid = opts.horizontalGrid;
	var verticalGrid = opts.verticalGrid;
	var createToolsWindow = opts.createToolsWindow;
	var shouldUseEditTabletApp = opts.shouldUseEditTabletApp;
	var listeners = [];

	var webView = null;
	webView = Tablet.getTablet("com.highfidelity.interface.tablet.system");
	webView.setVisible = function (value) {};

	horizontalGrid.addListener(function (data) {
		var dataString = JSON.stringify(data);
		webView.emitScriptEvent(dataString);
		createToolsWindow.emitScriptEvent(dataString);
		if (selectionDisplay) {
			selectionDisplay.updateHandles();
		}
	});

	var webEventReceived = function (data) {
		try {
			data = JSON.parse(data);
		} catch (e) {
			return;
		}

		if (data.type === "init") {
			horizontalGrid.emitUpdate();
		} else if (data.type === "update") {
			horizontalGrid.update(data);
			for (var i = 0; i < listeners.length; i++) {
				listeners[i] && listeners[i](data);
			}
		} else if (data.type === "action") {
			var action = data.action;
			if (action === "moveToAvatar") {
				var position = MyAvatar.getJointPosition("LeftFoot");
				if (position.x === 0 && position.y === 0 && position.z === 0) {
					position = MyAvatar.position;
				}
				horizontalGrid.setPosition(position);
			} else if (action === "moveToSelection") {
				horizontalGrid.moveToSelection();
			}
		} else if (data.type === "keyUpEvent") {
			keyUpEventFromUIWindow(data.keyUpEvent);
		}
	};

	webView.webEventReceived.connect(webEventReceived);
	if (Settings.getValue("experimentalCreateToolsRepositioning")) {
		createToolsWindow.webEventReceived.connect(webEventReceived);
	} else {
		createToolsWindow.webEventReceived.addListener(webEventReceived);
	}

	that.addListener = function (callback) {
		listeners.push(callback);
	};

	that.setVisible = function (visible) {
		webView.setVisible(shouldUseEditTabletApp() && visible);
	};

	return that;
};
