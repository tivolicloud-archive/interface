﻿//
//  TTSScriptingInterface.cpp
//  libraries/audio-client/src/scripting
//
//  Created by Zach Fox on 2018-10-10.
//  Copyright 2018 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

#include "TTSScriptingInterface.h"
#include "avatar/AvatarManager.h"

#include <QProcess>
#include <QThreadPool>

#include <Sound.h>

TTSScriptingInterface::TTSScriptingInterface() {
#ifdef WIN32
    //
    // Create text to speech engine
    //
    HRESULT hr = m_tts.CoCreateInstance(CLSID_SpVoice);
    if (FAILED(hr)) {
        qDebug() << "Text-to-speech engine creation failed.";
    }

    //
    // Get token corresponding to default voice
    //
    hr = SpGetDefaultTokenFromCategoryId(SPCAT_VOICES, &m_voiceToken, FALSE);
    if (FAILED(hr)) {
        qDebug() << "Can't get default voice token.";
    }

    //
    // Set default voice
    //
    hr = m_tts->SetVoice(m_voiceToken);
    if (FAILED(hr)) {
        qDebug() << "Can't set default voice.";
    }

    _lastSoundAudioInjectorUpdateTimer.setSingleShot(true);
    connect(&_lastSoundAudioInjectorUpdateTimer, &QTimer::timeout, this, &TTSScriptingInterface::updateLastSoundAudioInjector);
#endif
}

TTSScriptingInterface::~TTSScriptingInterface() {
}

#ifdef WIN32
class ReleaseOnExit {
public:
    ReleaseOnExit(IUnknown* p) : m_p(p) {}
    ~ReleaseOnExit() {
        if (m_p) {
            m_p->Release();
        }
    }

private:
    IUnknown* m_p;
};
#endif

const int INJECTOR_INTERVAL_MS = 100;
void TTSScriptingInterface::updateLastSoundAudioInjector() {
    if (_lastSoundAudioInjector) {
        AudioInjectorOptions options;
        options.position = DependencyManager::get<AvatarManager>()->getMyAvatarPosition();
        DependencyManager::get<AudioInjectorManager>()->setOptions(_lastSoundAudioInjector, options);
        _lastSoundAudioInjectorUpdateTimer.start(INJECTOR_INTERVAL_MS);
    }
}

#if defined(WIN32) || defined(Q_OS_LINUX) || defined(Q_OS_MACOS)
void TTSScriptingInterface::speakText(const QString& textToSpeak) {
#ifdef WIN32
    WAVEFORMATEX fmt;
    fmt.wFormatTag = WAVE_FORMAT_PCM;
    fmt.nSamplesPerSec = AudioConstants::SAMPLE_RATE;
    fmt.wBitsPerSample = 16;
    fmt.nChannels = 1;
    fmt.nBlockAlign = fmt.nChannels * fmt.wBitsPerSample / 8;
    fmt.nAvgBytesPerSec = fmt.nSamplesPerSec * fmt.nBlockAlign;
    fmt.cbSize = 0;

    IStream* pStream = NULL;

    ISpStream* pSpStream = nullptr;
    HRESULT hr = CoCreateInstance(CLSID_SpStream, nullptr, CLSCTX_ALL, __uuidof(ISpStream), (void**)&pSpStream);
    if (FAILED(hr)) {
        qDebug() << "CoCreateInstance failed.";
    }
    ReleaseOnExit rSpStream(pSpStream);

    pStream = SHCreateMemStream(NULL, 0);
    if (nullptr == pStream) {
        qDebug() << "SHCreateMemStream failed.";
    }

    hr = pSpStream->SetBaseStream(pStream, SPDFID_WaveFormatEx, &fmt);
    if (FAILED(hr)) {
        qDebug() << "Can't set base stream.";
    }

    hr = m_tts->SetOutput(pSpStream, true);
    if (FAILED(hr)) {
        qDebug() << "Can't set output stream.";
    }

    ReleaseOnExit rStream(pStream);

    ULONG streamNumber;
    hr = m_tts->Speak(reinterpret_cast<LPCWSTR>(textToSpeak.utf16()), SPF_IS_XML | SPF_ASYNC | SPF_PURGEBEFORESPEAK,
                      &streamNumber);
    if (FAILED(hr)) {
        qDebug() << "Speak failed.";
    }

    m_tts->WaitUntilDone(-1);

    hr = pSpStream->GetBaseStream(&pStream);
    if (FAILED(hr)) {
        qDebug() << "Couldn't get base stream.";
    }

    hr = IStream_Reset(pStream);
    if (FAILED(hr)) {
        qDebug() << "Couldn't reset stream.";
    }

    ULARGE_INTEGER StreamSize;
    StreamSize.LowPart = 0;
    hr = IStream_Size(pStream, &StreamSize);

    DWORD dwSize = StreamSize.QuadPart;
    _lastSoundByteArray.resize(dwSize);

    hr = IStream_Read(pStream, _lastSoundByteArray.data(), dwSize);
    if (FAILED(hr)) {
        qDebug() << "Couldn't read from stream.";
    }

    uint32_t numChannels = 1;
    uint32_t numSamples = (uint32_t)_lastSoundByteArray.size() / sizeof(AudioData::AudioSample);
    auto samples = reinterpret_cast<AudioData::AudioSample*>(_lastSoundByteArray.data());
    auto newAudioData = AudioData::make(numSamples, numChannels, samples);
    
#elif defined(Q_OS_LINUX)
    QString filePath = QDir::tempPath() + QDir::separator() + "tivoli-tts.wav";

    // -- piping espeak to sox 

    // QString command = (
    //     "espeak --stdout -v female3 \"" + textToSpeak + "\" | " +
    //     "sox -t wav - -t wav - " +
    //     "overdrive 10 " +
    //     "echo 0.8 0.8 5 0.7 " +
    //     "echo 0.8 0.7 6 0.7 " +
    //     "echo 0.8 0.7 10 0.7 " +
    //     "echo 0.8 0.7 12 0.7 " +
    //     "echo 0.8 0.88 12 0.7 " +
    //     "echo 0.8 0.88 30 0.7 " +
    //     "echo 0.6 0.6 60 0.7 " +
    //     "gain 8 > " + filePath
    // );

    // QProcess process;
    // process.start("sh", QStringList() << "-c" << command);

    // -- espeak

    // QStringList args;
    // args << "-w" << fileName;
    // args << textToSpeak;

    // QProcess process;
    // process.start("espeak", args);

    // -- festival

    QStringList args;
    args << "--batch";
    // args << "(voice_cmu_us_slt_cg)";
    args << "(set! textToSpeak (Utterance Text \"" + QString(textToSpeak).replace("\"", "\\\"") + "\"))";
    args << "(utt.synth textToSpeak)";
    args << "(utt.save.wave textToSpeak \"" + QString(filePath).replace("\"", "\\\"") + "\")";
    args << textToSpeak;

    QProcess process;
    process.start("festival", args);

#elif defined(Q_OS_MACOS)
    QString filePath = QDir::tempPath() + QDir::separator() + "tivoli-tts.wav";

    QStringList args;
    args << "-o";
    args << filePath;
    args << "--data-format=LEI16@44100";
    args << textToSpeak;

    QProcess process;
    process.start("say", args);

#endif
#if defined(Q_OS_LINUX) || defined(Q_OS_MACOS)
    if (!process.waitForFinished(5000)) {
        process.kill();
        return;
    }

    QFile* file = new QFile(filePath);
    if (file->open(QIODevice::ReadOnly)) {

        _tempResource = QSharedPointer<Resource>::create(QUrl::fromLocalFile(filePath));
        auto soundProcessor = new SoundProcessor(_tempResource, file->readAll());

        QObject::connect(soundProcessor, &SoundProcessor::onError, this, [=](int error, QString str){
            qDebug() << "Text to speech wav processing failed" << error << str;
            file->remove();
        });

        QObject::connect(soundProcessor, &SoundProcessor::onSuccess, this, [=](AudioDataPointer newAudioData){
            file->remove();
#endif

    AudioInjectorOptions options;
    // TODO: keep audio position up to date with avatar
    options.position = DependencyManager::get<AvatarManager>()->getMyAvatarPosition();
    options.volume = 0.7;

    if (_lastSoundAudioInjector) {
        DependencyManager::get<AudioInjectorManager>()->stop(_lastSoundAudioInjector);
        _lastSoundAudioInjectorUpdateTimer.stop();
    }

    _lastSoundAudioInjector = DependencyManager::get<AudioInjectorManager>()->playSound(newAudioData, options, true);
    _lastSoundAudioInjectorUpdateTimer.start(INJECTOR_INTERVAL_MS);
       
#if defined(Q_OS_LINUX) || defined(Q_OS_MACOS)
        });
       
        QThreadPool::globalInstance()->start(soundProcessor);
    } else {
        file->remove();
    }
#endif
}
#else
void TTSScriptingInterface::speakText(const QString& textToSpeak) {
    qDebug() << "Text to speech only works on Windows, macOS and Linux";
}
#endif

void TTSScriptingInterface::stopLastSpeech() {
    if (_lastSoundAudioInjector) {
        DependencyManager::get<AudioInjectorManager>()->stop(_lastSoundAudioInjector);
        _lastSoundAudioInjector = nullptr;
    }
}
