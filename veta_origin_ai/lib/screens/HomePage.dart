import 'package:flutter/material.dart';
import 'package:veta_origin_ai/widgets/ChatInputBar.dart';
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
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();

    double scrollSpeed = 0.3;
    _scrollController = ScrollController();
    _animationController =
        AnimationController(vsync: this, duration: Duration(seconds: 1))
          ..addListener(() {
            if (_scrollController.hasClients &&
                _scrollController.position.haveDimensions) {
              double max = _scrollController.position.maxScrollExtent;
              double current = _scrollController.offset;

              double next = current + scrollSpeed;

              _scrollController.jumpTo(next <= max ? next : 0);

              // if (_scrollController.offset >=
              //     _scrollController.position.maxScrollExtent) {
              //   _scrollController.jumpTo(0);
              // }
            }
          })
          ..repeat();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _animationController.dispose();
    super.dispose();
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
            // Text("VETA ORIGIN", style: TextStyle(color: Colors.white)),
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
        backgroundColor: const Color(0xFF030213),
      ),
      backgroundColor: const Color(0xFF030213),
      drawer: SideDrawer(),
      body: Container(
        width: double.infinity,
        height: double.infinity,
        child: Padding(
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
                    padding: const EdgeInsets.only(
                      top: 22,
                      right: 22,
                      left: 22,
                    ),
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.deepPurple,
                        foregroundColor: Colors.white,
                        // minimumSize: Size(100, 30),
                      ),
                      onPressed: () {},
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
                  SizedBox(width: 12),
                  Padding(
                    padding: const EdgeInsets.only(top: 0, right: 22, left: 22),
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.black,
                        foregroundColor: Colors.white,
                        // minimumSize: Size(100, 30),
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
        ),
      ),
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
            ChatInputBar(),
            SizedBox(
              height: 30,
              child: ListView(
                controller: _scrollController,
                scrollDirection: Axis.horizontal,
                children: [
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey.shade800,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () {},
                    child: Row(
                      children: [Icon(Icons.star_rate), Text("DeepThink")],
                    ),
                  ),
                  SizedBox(width: 12),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey.shade800,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () {},
                    child: Row(children: [Icon(Icons.search), Text("Search")]),
                  ),
                  SizedBox(width: 12),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey.shade800,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () {},
                    child: Row(children: [Icon(Icons.light), Text("Quick AI")]),
                  ),
                  SizedBox(width: 12),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey.shade800,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () {},
                    child: Row(children: [Icon(Icons.code), Text("Code")]),
                  ),
                  SizedBox(width: 12),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey.shade800,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () {},
                    child: Row(children: [Icon(Icons.language), Text("Web")]),
                  ),
                  SizedBox(width: 12),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey.shade800,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () {},
                    child: Row(
                      children: [
                        Icon(Icons.document_scanner),
                        Text("Document"),
                      ],
                    ),
                  ),
                  SizedBox(width: 12),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey.shade800,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () {},
                    child: Row(children: [Icon(Icons.image), Text("Image")]),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
