"use strict";

function tryQuery(permissionDesc, dflt) {
	if (navigator.permissions && navigator.permissions.query) {
		return navigator.permissions.query(permissionDesc);
	} else {
		return Promise.resolve({state: dflt});
	}
}

function requestGeolocation(permissionDesc) {
	return new Promise(function (resolve, reject) {
		var enableHighAccuracy = permissionDesc.enableHighAccuracy, timeout = permissionDesc.timeout,
			maximumAge = permissionDesc.maximumAge;
		navigator.geolocation.getCurrentPosition(function (_a) {
			var coords = _a.coords, timestamp = _a.timestamp;
			resolve(tryQuery(permissionDesc, "granted")
				.then(function (_a) {
					var state = _a.state;
					state, coords, timestamp;
				}));
		}, function (_a) {
			var code = _a.code, message = _a.message;
			resolve(tryQuery(permissionDesc, "prompt"));
		}, {enableHighAccuracy: enableHighAccuracy, timeout: timeout, maximumAge: maximumAge});
	});
}

function requestNotifications(permissionDesc) {
	return Notification.requestPermission().then(function (state) {
		switch (state) {
			case "default":
				return {state: "prompt"};
			case "granted":
				return {state: "granted"};
			case "denied":
				return {state: "denied"};
		}
		throw new TypeError(state);
	});
}

function requestPush(permissionDesc) {
	return new Promise(function (resolve, reject) {
		var _a = permissionDesc, serviceWorker = _a.serviceWorker, userVisibleOnly = _a.userVisibleOnly,
			applicationServerKey = _a.applicationServerKey;
		if (!(serviceWorker instanceof ServiceWorkerRegistration)) {
			throw new TypeError();
		}
		resolve(serviceWorker.pushManager.subscribe({
			userVisibleOnly: userVisibleOnly,
			applicationServerKey: applicationServerKey
		})
			.then(function (subscription) {
				return ({state: "granted", subscription: subscription});
			}, function (err) {
				if (err.name === "NotAllowedError") {
					return {state: "denied"};
				}
				// Re-throw SecurityError, InvalidStateError,
				// and AbortError.
				throw err;
			}));
	});
}

function requestMidi(permissionDesc) {
	var sysex = permissionDesc.sysex, software = permissionDesc.software;
	return navigator.requestMIDIAccess({sysex: sysex, software: software})
		.then(function (access) {
			return ({state: "granted", access: access});
		}, function (err) {
			if (err.name === "SecurityError") {
				return {state: "denied"};
			}
			throw err;
		});
}

function requestCamera(permissionDesc) {
	return new Promise(function (resolve, reject) {
		var constraints = permissionDesc.constraints, peerIdentity = permissionDesc.peerIdentity;
		navigator.mediaDevices.getUserMedia({
			video: constraints ? constraints : true,
			peerIdentity: peerIdentity
		}, function (stream) {
			return resolve({state: "granted", stream: stream});
		}, function (err) {
			if (err.name === "PermissionDeniedError") {
				resolve({state: "denied"});
			}
			reject(err);
		});
	});
}

function requestMicrophone(permissionDesc) {
	return new Promise(function (resolve, reject) {
		var constraints = permissionDesc.constraints, peerIdentity = permissionDesc.peerIdentity;
		navigator.mediaDevices.getUserMedia({
			audio: constraints ? constraints : true,
			peerIdentity: peerIdentity
		}, function (stream) {
			return resolve({state: "granted", stream: stream});
		}, function (err) {
			if (err.name === "PermissionDeniedError") {
				resolve({state: "denied"});
			}
			reject(err);
		});
	});
}

function requestSpeaker(permissionDesc) {
	return Promise.reject(new TypeError("speaker can't be requested (yet?)"));
}

function requestDeviceInfo(permissionDesc) {
	return Promise.reject(new TypeError("device-info can't be requested (yet?)"));
}

function requestBackgroundSync(permissionDesc) {
	try {
		var serviceWorker = permissionDesc.serviceWorker, tag = permissionDesc.tag;
		return serviceWorker.sync.register(tag).then(function () {
			return ({state: "granted"});
		}, function (err) {
			if (err.name === "NotAllowedError") {
				return {state: "denied"};
			}
			throw err;
		});
	} catch (e) {
		return Promise.reject(e);
	}
}

function requestBluetooth(permissionDesc) {
	if (navigator.bluetooth && navigator.bluetooth.requestDevice) {
		return navigator.bluetooth.requestDevice(permissionDesc)
			.then(function (device) {
				return ({state: "prompt", devices: [device]});
			}, function (err) {
				if (err.name === "NotFoundError") {
					return {state: "prompt", devices: []};
				}
				throw err;
			});
	}
	return Promise.reject(new TypeError("navigator.bluetooth not supported"));
}

function requestPersistentStorage(permissionDesc) {
	return navigator.storage.persist().then(function (persisted) {
		if (persisted) {
			return {state: "granted"};
		} else {
			return {state: "denied"};
		}
	});
}

function request(permissionDesc) {
	switch (permissionDesc.name) {
		case "geolocation":
			return requestGeolocation(permissionDesc);
		case "notifications":
			return requestNotifications(permissionDesc);
		case "push":
			return requestPush(permissionDesc);
		case "midi":
			return requestMidi(permissionDesc);
		case "camera":
			return requestCamera(permissionDesc);
		case "microphone":
			return requestMicrophone(permissionDesc);
		case "speaker":
			return requestSpeaker(permissionDesc);
		case "device-info":
			return requestDeviceInfo(permissionDesc);
		case "background-sync":
			return requestBackgroundSync(permissionDesc);
		case "bluetooth":
			return requestBluetooth(permissionDesc);
		case "persistent-storage":
			return requestPersistentStorage(permissionDesc);
	}
	// Issue: Permissions doesn't specify what to do for an unrecognized
	// PermissionName.
	return Promise.reject(new TypeError("Unknown PermissionName: " + permissionDesc.name));
}

if (!self.navigator.permissions) {
	self.navigator.permissions = {};
}

if (!self.navigator.permissions.request) {
	self.navigator.permissions.request = request;
}