import 'package:flutter/material.dart';

class ChatInputBar extends StatefulWidget {
  final Function(String) onSend;
  const ChatInputBar({required this.onSend, super.key});

  @override
  State<ChatInputBar> createState() => _ChatInputBarState();
}

class _ChatInputBarState extends State<ChatInputBar> {
  final TextEditingController controller = TextEditingController();
  bool isTyping = false;

  @override
  void initState() {
    super.initState();
    controller.addListener(() {
      setState(() {
        isTyping = controller.text.trim().isNotEmpty;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    // final controller = TextEditingController();
    return SafeArea(
      child: Container(
        padding: EdgeInsets.only(left: 10, right: 10, top: 12, bottom: 5),
        decoration: BoxDecoration(
          color: const Color.fromARGB(255, 21, 21, 21),
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(18),
            topRight: Radius.circular(18),
          ),
        ),

        child: Container(
          padding: EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: const Color.fromARGB(255, 3, 3, 3),
            borderRadius: BorderRadius.circular(25),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: controller,
                      minLines: 1,
                      maxLines: 4,
                      decoration: InputDecoration(
                        hintText: "Ask anything here!",
                        hintStyle: TextStyle(color: Colors.grey, fontSize: 16),
                        border: InputBorder.none,
                      ),
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                  if (!isTyping)
                    IconButton(
                      onPressed: () {},
                      icon: Icon(Icons.mic, color: Colors.grey),
                    ),

                  IconButton(
                    onPressed: () {
                      controller.clear();
                    },
                    icon: Icon(Icons.arrow_upward_rounded, color: Colors.blue),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
