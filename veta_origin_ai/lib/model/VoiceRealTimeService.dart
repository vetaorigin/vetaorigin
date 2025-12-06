import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:flutter_sound/flutter_sound.dart';

class VoiceRealtimeService {
  WebSocketChannel? _channel;
  final FlutterSoundRecorder _recorder = FlutterSoundRecorder();
  final FlutterSoundPlayer _player = FlutterSoundPlayer();

  bool isConnected = false;
  bool isRecording = false;

  // NEW: controller for audio stream
  final StreamController<Uint8List> _audioController =
      StreamController<Uint8List>.broadcast();

  Future<void> init() async {
    await _recorder.openRecorder();
    await _player.openPlayer();
  }

  Future<void> connect() async {
    _channel = WebSocketChannel.connect(
      Uri.parse("ws://YOUR_BACKEND_URL/realtime"),
    );

    isConnected = true;

    // Listen to audio coming from backend
    _channel!.stream.listen((data) {
      _handleIncomingAudio(data);
    });

    // Listen to audio coming from microphone → send to backend
    _audioController.stream.listen((bytes) {
      _channel?.sink.add(bytes);
    });
  }

  void _handleIncomingAudio(dynamic data) async {
    if (data is Uint8List) {
      await _player.startPlayer(fromDataBuffer: data, codec: Codec.pcm16);
    }
  }

  Future<void> startStreaming() async {
    if (!isConnected) await connect();
    isRecording = true;

    await _recorder.startRecorder(
      codec: Codec.pcm16,
      sampleRate: 16000,
      numChannels: 1,

      /// FIX: FlutterSound expects a StreamSink<Uint8List>
      toStream: _audioController.sink,
    );
  }

  Future<void> stopStreaming() async {
    await _recorder.stopRecorder();
    isRecording = false;

    // tell backend that audio session ended
    _channel?.sink.add(jsonEncode({"event": "end"}));
  }
}
