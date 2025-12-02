import 'package:flutter/material.dart';
import 'package:veta_origin_ai/model/ChatMessage.dart';
import 'package:veta_origin_ai/widgets/ChatInputBar.dart';
import 'package:veta_origin_ai/widgets/ChatProvider.dart';
import 'package:veta_origin_ai/widgets/SideDrawer.dart';
import '../widgets/ThemeProvidder.dart';
import 'package:provider/provider.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage>
    with SingleTickerProviderStateMixin {
  late ScrollController _scrollController;
  late ScrollController _quickButtonsController;
  late AnimationController _animationController;
  bool isChatMode = false;

  @override
  void initState() {
    super.initState();
    _quickButtonsController = ScrollController();
    _scrollController = ScrollController();

    double scrollSpeed = 0.3;

    _animationController =
        AnimationController(vsync: this, duration: Duration(seconds: 1))
          ..addListener(() {
            if (_quickButtonsController.hasClients &&
                _quickButtonsController.position.haveDimensions) {
              double max = _quickButtonsController.position.maxScrollExtent;
              double current = _quickButtonsController.offset;

              double next = current + scrollSpeed;

              // loop horizontally
              _quickButtonsController.jumpTo(next <= max ? next : 0);
            }
          })
          ..repeat();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _quickButtonsController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  void _onSend(String message) {
    if (message.trim().isEmpty) return;

    setState(() => isChatMode = true);

    Provider.of<ChatProvider>(context, listen: false).sendMessage(message);

    // auto-scroll chat list to bottom after a short delay
    Future.delayed(const Duration(milliseconds: 220), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset("images/origin_logo.png", width: 138, height: 138),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(
              themeProvider.isDarkMode ? Icons.dark_mode : Icons.light_mode,
            ),
            onPressed: () {
              themeProvider.toggleTheme();
            },
          ),
        ],
        iconTheme: IconThemeData(
          color: Colors.grey, // your desired color
        ),
        backgroundColor: const Color.fromARGB(255, 0, 0, 0),
      ),
      backgroundColor: const Color.fromARGB(255, 0, 0, 0),
      drawer: SideDrawer(),
      body: Container(
        width: double.infinity,
        height: double.infinity,
        child: isChatMode ? _buildChatUI(context) : _buildWelcomeUI(context),
      ),

      // keep bottomSheet + ChatInputBar intact
      bottomSheet: Container(
        height: 100,
        decoration: BoxDecoration(
          color: const Color.fromARGB(255, 21, 21, 21),
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
          ),
        ),
        child: Column(
          // mainAxisAlignment: MainAxisAlignment.end,
          children: [
            // Use your custom ChatInputBar and hook up the onSend callback:
            ChatInputBar(onSend: (message) => _onSend(message)),

            SizedBox(
              height: 30,
              child: ListView(
                controller: _quickButtonsController,
                scrollDirection: Axis.horizontal,
                children: [
                  _buildQuickButton(Icons.star_rate, "DeepThink"),
                  SizedBox(width: 12),
                  _buildQuickButton(Icons.search, "Search"),
                  SizedBox(width: 12),
                  _buildQuickButton(Icons.light, "Quick AI"),
                  SizedBox(width: 12),
                  _buildQuickButton(Icons.code, "Code"),
                  SizedBox(width: 12),
                  _buildQuickButton(Icons.language, "Web"),
                  SizedBox(width: 12),
                  _buildQuickButton(Icons.document_scanner, "Document"),
                  SizedBox(width: 12),
                  _buildQuickButton(Icons.image, "Image"),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickButton(IconData icon, String text) {
    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.grey.shade800,
        foregroundColor: Colors.white,
      ),
      onPressed: () {
        // optional: prefill input bar or trigger a quick template
        // For now, just switch to chat mode so user can send
        setState(() => isChatMode = true);
      },
      child: Row(children: [Icon(icon), SizedBox(width: 6), Text(text)]),
    );
  }

  // ---------- Welcome UI ----------
  Widget _buildWelcomeUI(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 55),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            "Welcome to",
            style: TextStyle(fontSize: 28, color: Colors.white),
          ),
          RichText(
            text: TextSpan(
              children: [
                TextSpan(text: "the", style: TextStyle(fontSize: 28)),
                TextSpan(
                  text: " Veta Origin ",
                  style: TextStyle(color: Colors.deepPurple, fontSize: 28),
                ),
                TextSpan(text: "era", style: TextStyle(fontSize: 28)),
              ],
            ),
          ),
          Column(
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 22, right: 22, left: 22),
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.deepPurple,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () {
                    // optional: switch to chat mode or demo
                    setState(() => isChatMode = true);
                  },
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text("Experience Veta Origin App"),
                        Icon(Icons.arrow_forward),
                      ],
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(top: 0, right: 22, left: 22),
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.black,
                    foregroundColor: Colors.white,
                    side: BorderSide(color: Colors.white, width: 1),
                  ),
                  onPressed: () {},
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text("Build with Veta Origin"),
                        Icon(Icons.arrow_forward),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ---------- Chat UI ----------
  Widget _buildChatUI(BuildContext context) {
    final chat = Provider.of<ChatProvider>(context);

    return Column(
      children: [
        // header area (optional) - keep small spacing so chat area doesn't overlap AppBar
        SizedBox(height: 16),

        // Chat list
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.all(16),
            itemCount:
                chat.messages.length +
                (chat.isLoading ? 1 : 0) +
                (chat.hasError ? 1 : 0),
            itemBuilder: (context, index) {
              if (chat.isLoading && index == chat.messages.length) {
                return _buildLoadingBubble();
              }

              if (chat.hasError &&
                  index == chat.messages.length + (chat.isLoading ? 1 : 0)) {
                return _buildErrorBubble();
              }

              final msg = chat.messages[index];
              return _buildMessageBubble(msg);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildMessageBubble(ChatMessage msg) {
    final bool isUser = msg.isUser;
    // final String text = msg.message;

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        child: Container(
          margin: EdgeInsets.symmetric(vertical: 6),
          padding: EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isUser ? Colors.deepPurple : Colors.grey.shade800,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Text(
            "text",
            style: TextStyle(color: Colors.white, fontSize: 16),
          ),
        ),
      ),
    );
  }

  // Widget _buildMessageBubble(dynamic msg) {
  //   // msg expected shape: { text, isUser } or your ChatMessage type
  //   final bool isUser = msg.isUser ?? false;
  //   final String text = msg.text ?? msg.toString();

  //   return Align(
  //     alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
  //     child: ConstrainedBox(
  //       constraints: BoxConstraints(
  //         maxWidth: MediaQuery.of(context).size.width * 0.75,
  //       ),
  //       child: Container(
  //         margin: EdgeInsets.symmetric(vertical: 6),
  //         padding: EdgeInsets.all(14),
  //         decoration: BoxDecoration(
  //           color: isUser ? Colors.deepPurple : Colors.grey.shade800,
  //           borderRadius: BorderRadius.circular(16),
  //         ),
  //         child: Text(
  //           text,
  //           style: TextStyle(color: Colors.white, fontSize: 16),
  //         ),
  //       ),
  //     ),
  //   );
  // }

  Widget _buildLoadingBubble() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: EdgeInsets.symmetric(vertical: 6),
        padding: EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.grey.shade700,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: 10),
            Text("Thinking...", style: TextStyle(color: Colors.white)),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorBubble() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: EdgeInsets.symmetric(vertical: 6),
        padding: EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.red.shade700,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          "Network error — try again.",
          style: TextStyle(color: Colors.white),
        ),
      ),
    );
  }
}
