"use strict";

//  entityList.js
//
//  Copyright 2014 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

/* global EntityListTool, Tablet, selectionManager, Entities, Camera, MyAvatar, Vec3, Menu, Messages,
   cameraManager, MENU_EASE_ON_FOCUS, deleteSelectedEntities, toggleSelectedEntitiesLocked, toggleSelectedEntitiesVisible,
   keyUpEventFromUIWindow, Script, SelectionDisplay, SelectionManager, Clipboard */

var PROFILING_ENABLED = false;
var profileIndent = "";
const PROFILE_NOOP = function (_name, fn, args) {
	fn.apply(this, args);
};
const PROFILE = !PROFILING_ENABLED
	? PROFILE_NOOP
	: function (name, fn, args) {
			console.log(
				"PROFILE-Script " + profileIndent + "(" + name + ") Begin"
			);
			var previousIndent = profileIndent;
			profileIndent += "  ";
			var before = Date.now();
			fn.apply(this, args);
			var delta = Date.now() - before;
			profileIndent = previousIndent;
			console.log(
				"PROFILE-Script " +
					profileIndent +
					"(" +
					name +
					") End " +
					delta +
					"ms"
			);
	  };

EntityListTool = function (shouldUseEditTabletApp) {
	var that = {};

	var entityListWindow;

	if (Settings.getValue("experimentalCreateToolsRepositioning")) {
		var ENTITY_LIST_WIDTH = 460;

		entityListWindow = new OverlayWindow({
			source: Script.resolvePath("qml/EditEntityList.qml"),
			visible: false,
			frameless: true
		});
		entityListWindow.setPosition(0, 0);
		entityListWindow.setSize(ENTITY_LIST_WIDTH, Window.innerHeight);
	} else {
		var CreateWindow = Script.require("../modules/createWindow.js");

		var TITLE_OFFSET = 30;
		var ENTITY_LIST_WIDTH = 495;
		var MAX_DEFAULT_CREATE_TOOLS_HEIGHT = 900;
		entityListWindow = new CreateWindow(
			Script.resolvePath("./qml/EditEntityList.qml"),
			"Entity List",
			"com.highfidelity.create.entityListWindow",
			function () {
				var windowHeight = Window.innerHeight - TITLE_OFFSET;
				if (windowHeight > MAX_DEFAULT_CREATE_TOOLS_HEIGHT) {
					windowHeight = MAX_DEFAULT_CREATE_TOOLS_HEIGHT;
				}
				return {
					size: {
						x: ENTITY_LIST_WIDTH,
						y: windowHeight
					},
					position: {
						x: Window.x,
						y: Window.y + TITLE_OFFSET
					}
				};
			},
			false
		);
	}

	var webView = null;
	webView = Tablet.getTablet("com.highfidelity.interface.tablet.system");
	webView.setVisible = function (value) {};

	var filterInView = false;
	var searchRadius = 100;

	var visible = false;

	that.webView = webView;

	that.setVisible = function (newVisible) {
		visible = newVisible;
		webView.setVisible(shouldUseEditTabletApp() && visible);
		entityListWindow.setVisible(!shouldUseEditTabletApp() && visible);
	};

	that.isVisible = function () {
		return entityListWindow.isVisible();
	};

	that.setVisible(false);

	function emitJSONScriptEvent(data) {
		var dataString;
		PROFILE("Script-JSON.stringify", function () {
			dataString = JSON.stringify(data);
		});
		PROFILE("Script-emitScriptEvent", function () {
			webView.emitScriptEvent(dataString);
			if (Settings.getValue("experimentalCreateToolsRepositioning")) {
				if (entityListWindow) {
					entityListWindow.emitScriptEvent(dataString);
				}
			} else {
				if (entityListWindow.window) {
					entityListWindow.window.emitScriptEvent(dataString);
				}
			}
		});
	}

	that.toggleVisible = function () {
		that.setVisible(!visible);
	};

	selectionManager.addEventListener(function (isSelectionUpdate, caller) {
		if (caller === that) {
			// ignore events that we emitted from the entity list itself
			return;
		}
		var selectedIDs = [];

		for (var i = 0; i < selectionManager.selections.length; i++) {
			selectedIDs.push(selectionManager.selections[i]);
		}

		emitJSONScriptEvent({
			type: "selectionUpdate",
			selectedIDs: selectedIDs
		});
	});

	that.setSpaceMode = function (spaceMode) {
		emitJSONScriptEvent({
			type: "setSpaceMode",
			spaceMode: spaceMode
		});
	};

	that.clearEntityList = function () {
		emitJSONScriptEvent({
			type: "clearEntityList"
		});
	};

	that.removeEntities = function (deletedIDs, selectedIDs) {
		emitJSONScriptEvent({
			type: "removeEntities",
			deletedIDs: deletedIDs,
			selectedIDs: selectedIDs
		});
	};

	that.deleteEntities = function (deletedIDs) {
		emitJSONScriptEvent({
			type: "deleted",
			ids: deletedIDs
		});
	};

	function valueIfDefined(value) {
		return value !== undefined ? value : "";
	}

	function entityIsBaked(properties) {
		if (properties.type === "Model") {
			var lowerModelURL = properties.modelURL.toLowerCase();
			return (
				lowerModelURL.endsWith(".baked.fbx") ||
				lowerModelURL.endsWith(".baked.fst")
			);
		} else if (properties.type === "Zone") {
			var lowerSkyboxURL = properties.skybox
				? properties.skybox.url.toLowerCase()
				: "";
			var lowerAmbientURL = properties.ambientLight
				? properties.ambientLight.ambientURL.toLowerCase()
				: "";
			return (
				(lowerSkyboxURL === "" ||
					lowerSkyboxURL.endsWith(".texmeta.json")) &&
				(lowerAmbientURL === "" ||
					lowerAmbientURL.endsWith(".texmeta.json"))
			);
		} else {
			return false;
		}
	}

	that.sendUpdate = function () {
		PROFILE("Script-sendUpdate", function () {
			var entities = [];

			var ids;
			PROFILE("findEntities", function () {
				if (filterInView) {
					ids = Entities.findEntitiesInFrustum(Camera.frustum);
				} else {
					ids = Entities.findEntities(
						MyAvatar.position,
						searchRadius
					);
				}
			});

			var cameraPosition = Camera.position;
			PROFILE("getMultipleProperties", function () {
				var multipleProperties = Entities.getMultipleEntityProperties(
					ids,
					[
						"position",
						"name",
						"type",
						"locked",
						"visible",
						"renderInfo",
						"modelURL",
						"materialURL",
						"imageURL",
						"script",
						"certificateID",
						"skybox.url",
						"ambientLight.url"
					]
				);
				for (var i = 0; i < multipleProperties.length; i++) {
					var properties = multipleProperties[i];

					if (
						!filterInView ||
						Vec3.distance(properties.position, cameraPosition) <=
							searchRadius
					) {
						var url = "";
						if (properties.type === "Model") {
							url = properties.modelURL;
						} else if (properties.type === "Material") {
							url = properties.materialURL;
						} else if (properties.type === "Image") {
							url = properties.imageURL;
						}
						entities.push({
							id: ids[i],
							name: properties.name,
							type: properties.type,
							url: url,
							locked: properties.locked,
							visible: properties.visible,
							certificateID: properties.certificateID,
							verticesCount:
								properties.renderInfo !== undefined
									? valueIfDefined(
											properties.renderInfo.verticesCount
									  )
									: "",
							texturesCount:
								properties.renderInfo !== undefined
									? valueIfDefined(
											properties.renderInfo.texturesCount
									  )
									: "",
							texturesSize:
								properties.renderInfo !== undefined
									? valueIfDefined(
											properties.renderInfo.texturesSize
									  )
									: "",
							hasTransparent:
								properties.renderInfo !== undefined
									? valueIfDefined(
											properties.renderInfo.hasTransparent
									  )
									: "",
							isBaked: entityIsBaked(properties),
							drawCalls:
								properties.renderInfo !== undefined
									? valueIfDefined(
											properties.renderInfo.drawCalls
									  )
									: "",
							hasScript: properties.script !== ""
						});
					}
				}
			});

			var selectedIDs = [];
			for (var j = 0; j < selectionManager.selections.length; j++) {
				selectedIDs.push(selectionManager.selections[j]);
			}

			emitJSONScriptEvent({
				type: "update",
				entities: entities,
				selectedIDs: selectedIDs,
				spaceMode: SelectionDisplay.getSpaceMode()
			});
		});
	};

	function onFileSaveChanged(filename) {
		Window.saveFileChanged.disconnect(onFileSaveChanged);
		if (filename !== "") {
			var success = Clipboard.exportEntities(
				filename,
				selectionManager.selections
			);
			if (!success) {
				Window.notifyEditError("Export failed.");
			}
		}
	}

	var onWebEventReceived = function (data) {
		try {
			data = JSON.parse(data);
		} catch (e) {
			print("entityList.js: Error parsing JSON");
			return;
		}

		if (data.type === "selectionUpdate") {
			var ids = data.entityIds;
			var entityIDs = [];
			for (var i = 0; i < ids.length; i++) {
				entityIDs.push(ids[i]);
			}
			selectionManager.setSelections(entityIDs, that);
			if (data.focus) {
				cameraManager.enable();
				cameraManager.focus(
					selectionManager.worldPosition,
					selectionManager.worldDimensions,
					Menu.isOptionChecked(MENU_EASE_ON_FOCUS)
				);
			}
		} else if (data.type === "refresh") {
			that.sendUpdate();
		} else if (data.type === "teleport" || data.type === "avatarToEntity") {
			if (selectionManager.hasSelection()) {
				MyAvatar.position = selectionManager.worldPosition;
			}
		} else if (data.type === "entityToAvatar") {
			if (selectionManager.hasSelection()) {
				moveSelectedEntitiesToAvatar();
			}
		} else if (data.type === "export") {
			if (!selectionManager.hasSelection()) {
				Window.notifyEditError("No entities have been selected.");
			} else {
				Window.saveFileChanged.connect(onFileSaveChanged);
				Window.saveAsync("Select Where to Save", "", "*.json");
			}
		} else if (data.type === "delete") {
			deleteSelectedEntities();
		} else if (data.type === "toggleLocked") {
			toggleSelectedEntitiesLocked();
		} else if (data.type === "toggleVisible") {
			toggleSelectedEntitiesVisible();
		} else if (data.type === "filterInView") {
			filterInView = data.filterInView === true;
		} else if (data.type === "radius") {
			searchRadius = data.radius;
		} else if (data.type === "cut") {
			SelectionManager.cutSelectedEntities();
		} else if (data.type === "copy") {
			SelectionManager.copySelectedEntities();
		} else if (data.type === "paste") {
			SelectionManager.pasteEntities();
		} else if (data.type === "duplicate") {
			SelectionManager.duplicateSelection();
			that.sendUpdate();
		} else if (data.type === "rename") {
			Entities.editEntity(data.entityID, { name: data.name });
			// make sure that the name also gets updated in the properties window
			SelectionManager._update();
		} else if (data.type === "toggleSpaceMode") {
			SelectionDisplay.toggleSpaceMode();
		} else if (data.type === "keyUpEvent") {
			keyUpEventFromUIWindow(data.keyUpEvent);
		} else if (data.type === "avatarToEntity") {
			SelectionManager.avatarToEntity();
		} else if (data.type === "entityToAvatar") {
			moveSelectedEntitiesToAvatar();
		}
	};

	webView.webEventReceived.connect(onWebEventReceived);
	if (Settings.getValue("experimentalCreateToolsRepositioning")) {
		entityListWindow.webEventReceived.connect(onWebEventReceived);
	} else {
		entityListWindow.webEventReceived.addListener(onWebEventReceived);
	}
	that.interactiveWindowHidden = entityListWindow.interactiveWindowHidden;

	return that;
};
