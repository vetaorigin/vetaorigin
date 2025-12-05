import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:veta_origin_ai/widgets/ChatInputBar.dart';
import '../widgets/ChatProvider.dart';
import 'package:flutter_tts/flutter_tts.dart';
import '../model/ChatMessage.dart';

class ChatScreen extends StatefulWidget {
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _controller = TextEditingController();

  bool isRecording = false; // RIGHT ICON state
  late FlutterTts flutterTts;

  @override
  void initState() {
    super.initState();

    flutterTts = FlutterTts();

    // Listen to typing in the input field
    _controller.addListener(() {
      setState(() {}); // rebuild to update icon
    });

    flutterTts.setLanguage("en-US");
    flutterTts.setSpeechRate(0.5);
    flutterTts.setPitch(1.0);
  }

  // ----------------------------------------
  // PERMANENT MIC BUTTON
  // ----------------------------------------
  void onMainMicPressed() {
    print("🎤 Main Mic Button (Speech-to-Text will attach here)");
  }

  // ----------------------------------------
  // RIGHT BUTTON LOGIC — SEND or RECORD
  // ----------------------------------------
  void startRecordingMode() {
    print("🎤 Start Voice Chat Recording...");
    setState(() => isRecording = true);
  }

  void stopRecordingMode() {
    print("🛑 Stop Recording");
    setState(() => isRecording = false);
  }

  void sendMessage() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    Provider.of<ChatProvider>(context, listen: false).sendMessage(text);
    _controller.clear();
  }

  // ----------------------------------------
  // TTS for AI messages
  // ----------------------------------------
  Future<void> speakMessage(String text) async {
    await flutterTts.stop();
    await flutterTts.speak(text);
  }

  void scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 200), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ChatProvider>(
      builder: (context, chat, child) {
        // Auto Speak AI messages
        if (chat.messages.isNotEmpty) {
          final last = chat.messages.last;
          if (!last.isUser) {
            Future.microtask(() => speakMessage(last.message));
          }
        }

        scrollToBottom();

        return Scaffold(
          backgroundColor: Colors.white,
          body: Column(
            children: [
              // ---------------- CHAT LIST ----------------
              Expanded(
                child: ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount:
                      chat.messages.length +
                      (chat.isLoading ? 1 : 0) +
                      (chat.hasError ? 1 : 0),
                  itemBuilder: (context, index) {
                    // Loading Indicator
                    if (chat.isLoading && index == chat.messages.length) {
                      return Align(
                        alignment: Alignment.centerLeft,
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 10),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade200,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              SizedBox(
                                width: 10,
                                height: 10,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              ),
                              SizedBox(width: 10),
                              Text("Thinking..."),
                            ],
                          ),
                        ),
                      );
                    }

                    // Error bubble
                    if (chat.hasError &&
                        index ==
                            chat.messages.length + (chat.isLoading ? 1 : 0)) {
                      return Align(
                        alignment: Alignment.centerLeft,
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade100,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Text(
                            "Network issue — failed to get response.",
                            style: TextStyle(color: Colors.red),
                          ),
                        ),
                      );
                    }

                    final ChatMessage msg = chat.messages[index];

                    return Align(
                      alignment:
                          msg.isUser
                              ? Alignment.centerRight
                              : Alignment.centerLeft,
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 10),
                        constraints: const BoxConstraints(maxWidth: 280),
                        decoration: BoxDecoration(
                          color:
                              msg.isUser
                                  ? Colors.blueAccent
                                  : Colors.grey.shade200,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child:
                            msg.isUser
                                ? Text(
                                  msg.message,
                                  style: const TextStyle(color: Colors.white),
                                )
                                : Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        msg.message,
                                        style: const TextStyle(
                                          color: Colors.black,
                                        ),
                                      ),
                                    ),
                                    GestureDetector(
                                      onTap: () => speakMessage(msg.message),
                                      child: const Padding(
                                        padding: EdgeInsets.only(left: 8.0),
                                        child: Icon(
                                          Icons.volume_up,
                                          size: 20,
                                          color: Colors.black54,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                      ),
                    );
                  },
                ),
              ),

              // ---------------- NEW INPUT BAR ----------------
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 14,
                ),
                color: Colors.white,
                child: Row(
                  children: [
                    // Permanent Mic Button
                    GestureDetector(
                      onTap: onMainMicPressed,
                      child: const Icon(
                        Icons.mic_none,
                        size: 28,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(width: 14),

                    // TextField
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        decoration: const InputDecoration(
                          hintText: "Message",
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.all(Radius.circular(16)),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(width: 14),

                    // RIGHT ICON: Send or Record
                    GestureDetector(
                      onTap: () {
                        if (_controller.text.isNotEmpty) {
                          sendMessage();
                        } else {
                          if (!isRecording) {
                            startRecordingMode();
                          } else {
                            stopRecordingMode();
                          }
                        }
                      },
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 200),
                        transitionBuilder:
                            (child, anim) =>
                                ScaleTransition(scale: anim, child: child),
                        child:
                            _controller.text.isNotEmpty
                                ? const Icon(
                                  Icons.send,
                                  key: ValueKey('send'),
                                  size: 26,
                                  color: Colors.blueAccent,
                                )
                                : isRecording
                                ? const Icon(
                                  Icons.stop_circle,
                                  key: ValueKey('stop'),
                                  size: 32,
                                  color: Colors.red,
                                )
                                : const Icon(
                                  Icons.record_voice_over,
                                  key: ValueKey('record'),
                                  size: 28,
                                  color: Colors.black87,
                                ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
