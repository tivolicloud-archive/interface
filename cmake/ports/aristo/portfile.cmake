set(ARISTO_VERSION 0.8.1)
set(MASTER_COPY_SOURCE_PATH ${CURRENT_BUILDTREES_DIR}/src)

if (WIN32)
    vcpkg_download_distfile(
        ARISTO_SOURCE_ARCHIVE
        URLS https://cdn.tivolicloud.com/dependencies/aristo-0.8.1-windows.zip
        SHA512 05179c63b72a1c9f5be8a7a2b7389025da683400dbf819e5a6199dd6473c56774d2885182dc5a11cb6324058d228a4ead832222e8b3e1bebaa4c61982e85f0a8
        FILENAME aristo-0.8.1-windows.zip
    )

    vcpkg_extract_source_archive(${ARISTO_SOURCE_ARCHIVE})
    file(COPY ${MASTER_COPY_SOURCE_PATH}/aristo/include DESTINATION ${CURRENT_PACKAGES_DIR})
    file(COPY ${MASTER_COPY_SOURCE_PATH}/aristo/lib DESTINATION ${CURRENT_PACKAGES_DIR})
    file(COPY ${MASTER_COPY_SOURCE_PATH}/aristo/debug DESTINATION ${CURRENT_PACKAGES_DIR})
    file(COPY ${MASTER_COPY_SOURCE_PATH}/aristo/bin DESTINATION ${CURRENT_PACKAGES_DIR})
    file(COPY ${MASTER_COPY_SOURCE_PATH}/aristo/share DESTINATION ${CURRENT_PACKAGES_DIR})

endif ()
