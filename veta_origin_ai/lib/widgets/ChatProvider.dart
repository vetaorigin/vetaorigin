import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../model/ChatMessage.dart';

class ChatProvider extends ChangeNotifier {
  final List<ChatMessage> messages = [];
  bool isLoading = false;
  bool hasError = false;

  Future<void> sendMessage(String userMessage) async {
    messages.add(ChatMessage(text: userMessage, isUser: true));
    notifyListeners();

    isLoading = true;
    hasError = false;
    notifyListeners();

    try {
      final responseFuture = http.post(
        Uri.parse("http://172.20.10.6:4000/auth/chat"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"prompt": userMessage}),
      );

      // timeout after 20 seconds
      final response = await responseFuture.timeout(
        const Duration(seconds: 20),
        onTimeout: () {
          hasError = true;
          isLoading = false;
          notifyListeners();
          return http.Response("Timeout", 408);
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        messages.add(
          ChatMessage(text: data["reply"] ?? "No response", isUser: false),
        );
      } else {
        hasError = true;
      }
    } catch (e) {
      hasError = true;
    }

    isLoading = false;
    notifyListeners();
  }
}
