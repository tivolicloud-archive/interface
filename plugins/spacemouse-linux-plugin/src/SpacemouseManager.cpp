#include <QFile>

#include "SpacemouseManager.h"

bool SpacemouseManager::isSupported() const {
	return true;
}

bool SpacemouseManager::activate() {
    if (!QFile::exists("/var/run/spnav.sock") || spnav_open() == -1) {
        qDebug() << "Failed to connect to Spacemouse (spacenavd; /var/run/spnav.sock)";
        return false;
    }

	if (!instance) {
        instance = std::make_shared<SpacemouseDevice>();
    }

	if (instance->getDeviceID() == controller::Input::INVALID_DEVICE) {
        auto userInputMapper = DependencyManager::get<UserInputMapper>();
        userInputMapper->registerDevice(instance);
    }

    qDebug() << "Connected to Spacemouse!";
    _active = true;
    return true;
}

void SpacemouseManager::deactivate() {
    if (_active) {
        spnav_close();
        _active = false;

        int deviceID = instance->getDeviceID();
        auto userInputMapper = DependencyManager::get<UserInputMapper>();
        userInputMapper->removeDevice(deviceID);
    }

}

void SpacemouseManager::pluginFocusOutEvent() { 
    if (instance) {
        instance->focusOutEvent(); 
    }
}

void SpacemouseManager::pluginUpdate(float deltaTime, const controller::InputCalibrationData& inputCalibrationData) {
    if (spnav_poll_event(&sev)) {
		if (sev.type == SPNAV_EVENT_MOTION) {
            instance->currentPosition.x = sev.motion.x;
            instance->currentPosition.y = sev.motion.y;
            instance->currentPosition.z = sev.motion.z;
            instance->currentRotation.x = sev.motion.rx;
            instance->currentRotation.y = sev.motion.ry;
            instance->currentRotation.z = sev.motion.rz;
            instance->handleAxisEvent();
		} else if (sev.type == SPNAV_EVENT_BUTTON) {
            instance->setButton(sev.button.bnum, sev.button.press);
		}
	}
}