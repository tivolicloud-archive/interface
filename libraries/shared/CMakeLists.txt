set(TARGET_NAME shared)

include_directories("${QT_DIR}/include/QtCore/${QT_VERSION}/QtCore" "${QT_DIR}/include/QtCore/${QT_VERSION}")

# TODO: there isn't really a good reason to have Script linked here - let's get what is requiring it out (RegisteredMetaTypes.cpp)
setup_hifi_library(Gui Network Script)

if (WIN32)
    target_link_libraries(${TARGET_NAME} Wbemuuid.lib)
endif()

if (ANDROID)
    target_link_libraries(${TARGET_NAME} android)
endif()

if (APPLE)
    find_library(CoreFoundation CoreFoundation)
    find_library(IOKit IOKit)
    find_library(OpenGL OpenGL)
    target_link_libraries(${TARGET_NAME} ${CoreFoundation} ${IOKit} ${OpenGL})
endif ()

target_zlib()
target_nsight()
target_json()
target_brotli()

