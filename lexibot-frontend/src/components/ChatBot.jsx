import React, { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";

// Simple UI Components
const Button = ({ children, onClick, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition ${
      disabled ? "opacity-50 cursor-not-allowed" : ""
    }`}
  >
    {children}
  </button>
);

// Mock axios (replace later with real backend)
// const axios = {
//   post: async (url, data) => {
//     await new Promise((r) => setTimeout(r, 1000));
//     if (url === "/api/ask-query") {
//       return {
//         data: {
//           answer: `I understand your query: "${data.query}". Here's a general explanation. For legal accuracy, please consult a lawyer.`,
//         },
//       };
//     }
//     throw new Error("Invalid endpoint");
//   },
// };

// const res = await axios.post("http://127.0.0.1:8000/api/ask-query", { query: input });


// ChatBot component
export default function ChatBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("http://127.0.0.1:8000/api/ask-query", { query: input, });

      const aiMsg = { sender: "ai", text: res.data.answer };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Error fetching response." },
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 h-[600px] flex flex-col">
      <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg border">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 h-full flex items-center justify-center">
            <p>Start chatting with LexiBot — ask any legal question!</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-3 ${
                msg.sender === "user" ? "text-right" : "text-left"
              }`}
            >
              <div
                className={`inline-block max-w-[80%] p-3 rounded-lg ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white border text-gray-800"
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))
        )}
        {loading && (
          <div className="text-left">
            <div className="inline-block bg-white border p-3 rounded-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Type your legal question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button onClick={handleSend} disabled={loading}>
          Send
        </Button>
      </div>
    </div>
  );
}
