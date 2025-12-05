import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../model/ChatMessage.dart';

class ChatProvider extends ChangeNotifier {
  final List<ChatMessage> messages = [];
  bool isLoading = false;
  bool hasError = false;

  // 🔹 TEXT MESSAGE CALL
  Future<void> sendMessage(String userMessage) async {
    messages.add(ChatMessage(message: userMessage, isUser: true));
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
          ChatMessage(message: data["reply"] ?? "No response", isUser: false),
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

  // 🔹 REAL-TIME VOICE CHAT – SEND AUDIO
  Future<void> sendAudioMessage(List<int> audioBytes) async {
    messages.add(ChatMessage(message: "(voice message)", isUser: true));
    notifyListeners();

    isLoading = true;
    hasError = false;
    notifyListeners();

    try {
      String base64Audio = base64Encode(audioBytes);

      final responseFuture = http.post(
        Uri.parse("http://172.20.10.6:4000/auth/chat/audio"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "audio": base64Audio,
          "format": "wav", // or pcm_16 / m4a depending on your recorder
        }),
      );

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
          ChatMessage(
            message: data["reply"] ?? "No AI response",
            isUser: false,
          ),
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
