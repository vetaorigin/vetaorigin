import 'package:flutter/material.dart';
import 'package:veta_origin_ai/screens/SignupScreen.dart';

class SideDrawer extends StatefulWidget {
  const SideDrawer({super.key});

  @override
  State<SideDrawer> createState() => _SideDrawerState();
}

class _SideDrawerState extends State<SideDrawer> {
  @override
  Widget build(BuildContext context) {
    return Drawer(
      width: 250,
      backgroundColor: const Color(0xFF030213),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            height: 100,
            padding: EdgeInsets.only(top: 44.0, left: 20.0, bottom: 18.0),
            alignment: Alignment.centerLeft,
            child: Text(
              "VETA ORIGIN",
              style: TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(width: 1, color: Colors.grey.shade900),
              ),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 8.0, left: 12, right: 12),
              child: Container(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(top: 8, bottom: 12),
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                            side: BorderSide(),
                          ),
                        ),
                        onPressed: () {},
                        child: Padding(
                          padding: const EdgeInsets.only(top: 12, bottom: 12),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.add, size: 22, color: Colors.black),
                              SizedBox(width: 12),
                              Text(
                                "New Chat",
                                style: TextStyle(
                                  fontSize: 18,
                                  color: Colors.black,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Text("RECENT", style: TextStyle(color: Colors.grey)),
                    Container(
                      margin: EdgeInsets.only(top: 12),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        color: const Color(0xFF404046),
                      ),

                      child: Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Row(
                          children: [
                            Icon(
                              Icons.chat_bubble_outline,
                              color: Colors.white,
                            ),
                            SizedBox(width: 12),
                            Text(
                              "New conversation",
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          Container(
            decoration: BoxDecoration(
              color: Color(0xFFA1A1A1A),
              border: Border(
                top: BorderSide(width: 1, color: Colors.grey.shade900),
              ),
            ),
            padding: EdgeInsets.all(16),

            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.purple,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => SignupScreen()),
                    );
                  },
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.person, size: 22),
                      SizedBox(width: 12),
                      Text("Login/Sign up", style: TextStyle(fontSize: 18)),
                    ],
                  ),
                ),
                SizedBox(height: 12),
                DropdownButtonFormField(
                  dropdownColor: Color(0xFF121212),
                  decoration: InputDecoration(border: OutlineInputBorder()),
                  value: "English",
                  items: [
                    DropdownMenuItem(
                      value: "English",
                      child: Row(
                        children: [
                          Icon(Icons.language, size: 20, color: Colors.white),
                          SizedBox(width: 12),
                          Text(
                            "English",
                            style: TextStyle(color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                    DropdownMenuItem(
                      value: "Hausa",
                      child: Text(
                        "Hausa",
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                    DropdownMenuItem(
                      value: "Igbo",
                      child: Text(
                        "Igbo",
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                    DropdownMenuItem(
                      value: "Yoruba",
                      child: Text(
                        "Yoruba",
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                  ],
                  onChanged: (value) {},
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
