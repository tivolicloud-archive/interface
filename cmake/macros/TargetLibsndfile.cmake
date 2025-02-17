macro(TARGET_LIBSNDFILE)
    find_library(LIBSNDFILE_LIBRARY_RELEASE sndfile PATHS ${VCPKG_INSTALL_ROOT}/lib NO_DEFAULT_PATH)
    find_library(LIBSNDFILE_LIBRARY_DEBUG sndfile PATHS ${VCPKG_INSTALL_ROOT}/debug/lib NO_DEFAULT_PATH)
    select_library_configurations(LIBSNDFILE)

    find_library(FLAC_LIBRARY_RELEASE FLAC PATHS ${VCPKG_INSTALL_ROOT}/lib NO_DEFAULT_PATH)
    find_library(FLAC_LIBRARY_DEBUG FLAC PATHS ${VCPKG_INSTALL_ROOT}/debug/lib NO_DEFAULT_PATH)
    select_library_configurations(FLAC)

    find_library(OGG_LIBRARY_RELEASE ogg PATHS ${VCPKG_INSTALL_ROOT}/lib NO_DEFAULT_PATH)
    find_library(OGG_LIBRARY_DEBUG ogg PATHS ${VCPKG_INSTALL_ROOT}/debug/lib NO_DEFAULT_PATH)
    select_library_configurations(OGG)

    find_library(VORBIS_LIBRARY_RELEASE vorbis PATHS ${VCPKG_INSTALL_ROOT}/lib NO_DEFAULT_PATH)
    find_library(VORBIS_LIBRARY_DEBUG vorbis PATHS ${VCPKG_INSTALL_ROOT}/debug/lib NO_DEFAULT_PATH)
    select_library_configurations(VORBIS)

    find_library(VORBISENC_LIBRARY_RELEASE vorbisenc PATHS ${VCPKG_INSTALL_ROOT}/lib NO_DEFAULT_PATH)
    find_library(VORBISENC_LIBRARY_DEBUG vorbisenc PATHS ${VCPKG_INSTALL_ROOT}/debug/lib NO_DEFAULT_PATH)
    select_library_configurations(VORBISENC)

    find_library(OPUS_LIBRARY_RELEASE opus PATHS ${VCPKG_INSTALL_ROOT}/lib NO_DEFAULT_PATH)
    find_library(OPUS_LIBRARY_DEBUG opus PATHS ${VCPKG_INSTALL_ROOT}/debug/lib NO_DEFAULT_PATH)
    select_library_configurations(OPUS)

    find_library(MPG123_LIBRARY_RELEASE mpg123 libmpg123 PATHS ${VCPKG_INSTALL_ROOT}/lib NO_DEFAULT_PATH)
    find_library(MPG123_LIBRARY_DEBUG mpg123 libmpg123 PATHS ${VCPKG_INSTALL_ROOT}/debug/lib NO_DEFAULT_PATH)
    select_library_configurations(MPG123)

    find_library(MP3LAME_LIBRARY_RELEASE mp3lame libmp3lame PATHS ${VCPKG_INSTALL_ROOT}/lib NO_DEFAULT_PATH)
    find_library(MP3LAME_LIBRARY_DEBUG mp3lame libmp3lame PATHS ${VCPKG_INSTALL_ROOT}/debug/lib NO_DEFAULT_PATH)
    select_library_configurations(MP3LAME)

    target_link_libraries(${TARGET_NAME}
        ${LIBSNDFILE_LIBRARIES}
        ${FLAC_LIBRARIES}
        ${OGG_LIBRARIES}
        ${VORBIS_LIBRARIES}
        ${VORBISENC_LIBRARIES}
        ${OPUS_LIBRARIES}
        ${MPG123_LIBRARIES}
        ${MP3LAME_LIBRARIES}
    )
endmacro()
