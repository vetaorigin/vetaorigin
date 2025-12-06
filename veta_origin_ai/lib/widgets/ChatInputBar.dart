import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:permission_handler/permission_handler.dart';
import '../model/VoiceRealTimeService.dart';

class ChatInputBar extends StatefulWidget {
  final Function(String) onSend;
  const ChatInputBar({required this.onSend, super.key});

  @override
  State<ChatInputBar> createState() => _ChatInputBarState();
}

class _ChatInputBarState extends State<ChatInputBar> {
  final TextEditingController controller = TextEditingController();
  final realtimeVoice = VoiceRealtimeService();

  late stt.SpeechToText _speech;
  bool isListening = false;
  bool isRecordingRealtime = false; // 🔥 for real-time voice chat

  @override
  void initState() {
    super.initState();
    _speech = stt.SpeechToText();

    realtimeVoice.init();

    controller.addListener(() {
      setState(() {}); // updates send button visibility
    });
  }

  Future<void> _toggleListening() async {
    var status = await Permission.microphone.request();

    if (!status.isGranted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text("Microphone permission denied")));
      return;
    }

    bool available = await _speech.initialize(
      onStatus: (status) {
        print("STATUS: $status");
        if (status == "done" || status == "notListening") {
          setState(() => isListening = false);
        }
      },
      onError: (error) {
        print("ERROR: $error");
        setState(() => isListening = false);
      },
    );

    print("Mic initialized: $available");

    if (!available) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Speech recognition not supported on this device"),
        ),
      );
      return;
    }

    setState(() => isListening = true);

    _speech.listen(
      onResult: (result) {
        setState(() {
          controller.text = result.recognizedWords;
        });
      },
    );
  }

  // 🔥 REAL-TIME VOICE CHAT START / STOP
  Future<void> _toggleRealtimeVoice() async {
    if (!isRecordingRealtime) {
      print("🎤 Starting real-time streaming…");
      await realtimeVoice.startStreaming();
    } else {
      print("🛑 Stopping real-time streaming…");
      await realtimeVoice.stopStreaming();
    }

    setState(() {
      isRecordingRealtime = !isRecordingRealtime;
    });
  }

  Widget _buildMicAnimation() {
    return AnimatedContainer(
      duration: Duration(milliseconds: 350),
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        color: Colors.redAccent,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Colors.redAccent.withOpacity(0.6),
            blurRadius: isListening ? 18 : 4,
            spreadRadius: isListening ? 3 : 1,
          ),
        ],
      ),
      child: Icon(Icons.mic, color: Colors.white, size: 16),
    );
  }

  /// 🔥 minimal animation for real-time recording
  Widget _buildRealtimeRecordingIcon() {
    return AnimatedContainer(
      duration: Duration(milliseconds: 400),
      width: isRecordingRealtime ? 16 : 14,
      height: isRecordingRealtime ? 16 : 14,
      decoration: BoxDecoration(
        color: Colors.redAccent,
        shape: BoxShape.circle,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    bool hasText = controller.text.trim().isNotEmpty;

    return SafeArea(
      child: Container(
        padding: const EdgeInsets.only(left: 10, right: 10, top: 12, bottom: 5),
        decoration: const BoxDecoration(
          color: Color(0xFF151515),
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(18),
            topRight: Radius.circular(18),
          ),
        ),
        child: Container(
          padding: EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Color(0xFF030303),
            borderRadius: BorderRadius.circular(25),
          ),
          child: Row(
            children: [
              /// TEXT FIELD
              Expanded(
                child: TextField(
                  controller: controller,
                  minLines: 1,
                  maxLines: 4,
                  style: TextStyle(color: Colors.white),
                  decoration: const InputDecoration(
                    hintText: "Ask anything here!",
                    hintStyle: TextStyle(color: Colors.grey),
                    border: InputBorder.none,
                  ),
                ),
              ),

              /// MICROPHONE BUTTON
              IconButton(
                onPressed: _toggleListening,
                icon:
                    isListening
                        ? _buildMicAnimation()
                        : Icon(Icons.mic, color: Colors.grey),
              ),

              /// RECORD / SEND ICON
              IconButton(
                onPressed: () {
                  final text = controller.text.trim();

                  /// 🔥 If text is empty → start real-time voice chat
                  if (text.isEmpty) {
                    _toggleRealtimeVoice();
                    return;
                  }

                  if (isListening) {
                    _speech.stop();
                    setState(() => isListening = false);
                  }

                  widget.onSend(text);
                  controller.clear();
                },
                icon:
                    hasText
                        ? Icon(Icons.arrow_upward, color: Colors.blue)
                        : _buildRealtimeRecordingIcon(), // 🔥 realtime recording icon
              ),
            ],
          ),
        ),
      ),
    );
  }
}
