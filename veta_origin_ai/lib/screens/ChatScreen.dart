import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:veta_origin_ai/widgets/ChatInputBar.dart';
import '../widgets/ChatProvider.dart';

class ChatScreen extends StatefulWidget {
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  void _send() {
    if (_controller.text.trim().isEmpty) return;

    final text = _controller.text.trim();
    _controller.clear();

    Provider.of<ChatProvider>(context, listen: false).sendMessage(text);

    Future.delayed(const Duration(milliseconds: 200), () {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ChatProvider>(
      builder: (context, chat, child) {
        return Scaffold(
          backgroundColor: Colors.white,
          body: Column(
            children: [
              Expanded(
                child: ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount:
                      chat.messages.length +
                      (chat.isLoading ? 1 : 0) +
                      (chat.hasError ? 1 : 0),
                  itemBuilder: (context, index) {
                    // Loading bubble
                    if (chat.isLoading && index == chat.messages.length) {
                      return Align(
                        alignment: Alignment.centerLeft,
                        child: Container(
                          padding: EdgeInsets.all(12),
                          margin: EdgeInsets.only(bottom: 10),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade200,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(
                                width: 6,
                                height: 6,
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
                          padding: EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade100,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Text(
                            "Network issue — response failed",
                            style: TextStyle(color: Colors.red),
                          ),
                        ),
                      );
                    }

                    final msg = chat.messages[index];

                    return Align(
                      alignment:
                          msg.isUser
                              ? Alignment.centerRight
                              : Alignment.centerLeft,
                      child: Container(
                        padding: EdgeInsets.all(12),
                        margin: EdgeInsets.only(bottom: 10),
                        constraints: BoxConstraints(maxWidth: 260),
                        decoration: BoxDecoration(
                          color:
                              msg.isUser
                                  ? Colors.blueAccent
                                  : Colors.grey.shade200,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          msg.text,
                          style: TextStyle(
                            color: msg.isUser ? Colors.white : Colors.black,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),

              // Input area
              ChatInputBar(
                onSend: (message) {
                  Provider.of<ChatProvider>(
                    context,
                    listen: false,
                  ).sendMessage(message);

                  Future.delayed(Duration(milliseconds: 200), () {
                    _scrollController.animateTo(
                      _scrollController.position.maxScrollExtent,
                      duration: Duration(milliseconds: 300),
                      curve: Curves.easeOut,
                    );
                  });
                },
              ),
            ],
          ),
        );
      },
    );
  }
}
