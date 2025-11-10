import ChatBot from "./components/ChatBot";
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";

// Mock axios since we don't have backend
// const axios = {
//   post: async (url, data) => {
//     // Simulate API delay
//     await new Promise(resolve => setTimeout(resolve, 1000));
    
//     if (url === "/api/ask-query") {
//       return {
//         data: {
//           answer: `I understand your question about "${data.query}". As an AI legal assistant, I can help analyze legal concepts. For specific legal advice, please consult a qualified attorney.`
//         }
//       };
//     }
    
//     if (url === "/api/summarize") {
//       return {
//         data: {
//           summary: `This document appears to be a legal document containing approximately ${Math.floor(Math.random() * 1000) + 500} words. Key points include contractual obligations, liability clauses, and dispute resolution mechanisms. The document follows standard legal formatting and contains typical legal provisions.`
//         }
//       };
//     }
    
//     throw new Error("API endpoint not found");
//   }
// };

import axios from "axios";

axios.defaults.baseURL = "http://127.0.0.1:8000";


// Simple UI Components
const Button = ({ children, onClick, className = "", disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

const Card = ({ children, className = "" }) => (
  <div className={`border border-gray-200 rounded-lg p-4 shadow-sm bg-white ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children }) => <div className="p-2">{children}</div>;

// Icons (using simple text icons as fallback)
const SendIcon = () => <span>📤</span>;
const UploadIcon = () => <span>📎</span>;
const FileTextIcon = () => <span>📄</span>;
const BarChartIcon = () => <span>📊</span>;
const MessageSquareIcon = () => <span>💬</span>;
const HomeIcon = () => <span>🏠</span>;
const InfoIcon = () => <span>ℹ️</span>;

export default function LexiBotApp() {
  const [activeTab, setActiveTab] = useState("home");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = { sender: "user", text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    
    try {
      // const res = await axios.post("/api/ask-query", { query: input });
      const res = await axios.post("http://127.0.0.1:8000/api/ask-query", { query: input });
      const aiMsg = { sender: "ai", text: res.data.answer };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg = { sender: "ai", text: "Sorry, I encountered an error. Please try again." };
      setMessages(prev => [...prev, errorMsg]);
    }
    
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      // const res = await axios.post("/api/summarize", formData);
      const res = await axios.post("http://127.0.0.1:8000/api/summarize", formData);

      setSummary(res.data.summary);
    } catch (error) {
      setSummary("Error summarizing file. Please try again with a different file.");
    }
    
    setLoading(false);
  };

  // Sample data for charts
  const performanceData = [
    { metric: "Accuracy", value: 92 },
    { metric: "Response Time", value: 85 },
    { metric: "User Satisfaction", value: 95 },
    { metric: "Case Relevance", value: 88 }
  ];

  const caseLawData = [
    { case: "Smith v. Jones", citations: 15 },
    { case: "Doe v. State", citations: 9 },
    { case: "Brown Corp", citations: 12 },
    { case: "Wilson Appeal", citations: 6 },
    { case: "Taylor Ltd", citations: 8 },
    { case: "Miller Case", citations: 11 }
  ];

  // Tab rendering functions
  const renderHome = () => (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-blue-800 mb-4">
          ⚖️ Welcome to LexiBot
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Your intelligent AI legal assistant for instant legal insights, document analysis, and case law research.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card className="text-center p-6 hover:shadow-lg transition-shadow">
          <div className="text-3xl mb-4">💬</div>
          <h3 className="text-xl font-semibold mb-3">Ask Legal Questions</h3>
          <p className="text-gray-600">
            Get instant AI-powered responses to your legal queries with relevant case references.
          </p>
        </Card>

        <Card className="text-center p-6 hover:shadow-lg transition-shadow">
          <div className="text-3xl mb-4">📄</div>
          <h3 className="text-xl font-semibold mb-3">Document Analysis</h3>
          <p className="text-gray-600">
            Upload legal documents and receive comprehensive summaries and key insights.
          </p>
        </Card>

        <Card className="text-center p-6 hover:shadow-lg transition-shadow">
          <div className="text-3xl mb-4">📊</div>
          <h3 className="text-xl font-semibold mb-3">Legal Analytics</h3>
          <p className="text-gray-600">
            Track performance metrics and explore case law trends with interactive dashboards.
          </p>
        </Card>
      </div>

      <Card className="p-8 bg-blue-50 border-blue-200">
        <h2 className="text-2xl font-bold text-blue-800 mb-4 text-center">
          Get Started Today
        </h2>
        <div className="flex flex-wrap gap-4 justify-center">
          <Button onClick={() => setActiveTab("chat")}>
            Start Chatting
          </Button>
          <Button onClick={() => setActiveTab("docs")}>
            Upload Document
          </Button>
          <Button onClick={() => setActiveTab("analytics")}>
            View Analytics
          </Button>
        </div>
      </Card>
    </div>
  );

  // const renderChat = () => (
  //   <div className="max-w-4xl mx-auto p-6 h-[600px] flex flex-col">
  //     <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg border">
  //       {messages.length === 0 ? (
  //         <div className="text-center text-gray-500 h-full flex items-center justify-center">
  //           <div>
  //             <MessageSquareIcon />
  //             <p className="mt-2">Start a conversation with LexiBot. Ask any legal question!</p>
  //           </div>
  //         </div>
  //       ) : (
  //         messages.map((msg, index) => (
  //           <motion.div
  //             key={index}
  //             initial={{ opacity: 0, y: 10 }}
  //             animate={{ opacity: 1, y: 0 }}
  //             className={`mb-4 ${msg.sender === "user" ? "text-right" : "text-left"}`}
  //           >
  //             <div
  //               className={`inline-block max-w-[80%] p-3 rounded-lg ${
  //                 msg.sender === "user"
  //                   ? "bg-blue-600 text-white"
  //                   : "bg-white border text-gray-800"
  //               }`}
  //             >
  //               {msg.text}
  //             </div>
  //           </motion.div>
  //         ))
  //       )}
  //       {loading && (
  //         <div className="text-left">
  //           <div className="inline-block bg-white border p-3 rounded-lg">
  //             <div className="flex space-x-2">
  //               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
  //               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
  //               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
  //             </div>
  //           </div>
  //         </div>
  //       )}
  //     </div>

  //     <div className="flex gap-2">
  //       <input
  //         type="text"
  //         value={input}
  //         onChange={(e) => setInput(e.target.value)}
  //         onKeyPress={(e) => e.key === "Enter" && handleSend()}
  //         placeholder="Type your legal question here..."
  //         className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
  //         disabled={loading}
  //       />
  //       <Button onClick={handleSend} disabled={loading || !input.trim()}>
  //         <SendIcon />
  //       </Button>
  //     </div>
  //   </div>
  // );

  const renderDocs = () => (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-center text-blue-800 mb-8">
        Document Analysis
      </h2>

      <Card className="p-8 text-center mb-8">
        <UploadIcon />
        <h3 className="text-xl font-semibold mb-4">Upload Legal Document</h3>
        <p className="text-gray-600 mb-4">
          Upload contracts, case files, or legal documents for AI-powered analysis
        </p>
        <input
          type="file"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          disabled={loading}
        />
        {file && (
          <p className="mt-4 text-sm text-gray-600">
            Selected: {file.name}
          </p>
        )}
      </Card>

      {loading && (
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Analyzing document...</p>
        </Card>
      )}

      {summary && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <h3 className="text-xl font-semibold mb-4">Document Summary</h3>
            <CardContent>
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">{summary}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );

  const renderAnalytics = () => (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-center text-blue-800 mb-8">
        📊 Legal Analytics Dashboard
      </h2>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <h3 className="text-xl font-semibold mb-4 text-center">
            System Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-xl font-semibold mb-4 text-center">
            Case Law Citations
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={caseLawData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="case" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="citations" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <h3 className="text-xl font-semibold mb-4 text-center">
          Quick Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Queries Handled", value: "1,247" },
            { label: "Documents Analyzed", value: "89" },
            { label: "Avg Response Time", value: "2.3s" },
            { label: "Accuracy Rate", value: "94%" }
          ].map((stat, index) => (
            <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderAbout = () => (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-center text-blue-800 mb-8">
        About LexiBot
      </h2>
      
      <Card className="p-8">
        <div className="prose max-w-none">
          <p className="text-lg text-gray-700 mb-6">
            LexiBot is an advanced AI-powered legal assistant designed to make legal information 
            accessible and understandable for everyone. Our platform leverages cutting-edge 
            artificial intelligence to provide instant legal insights and document analysis.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-lg mb-3">🌟 Features</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Instant legal query responses</li>
                <li>Document summarization</li>
                <li>Case law research</li>
                <li>Performance analytics</li>
                <li>User-friendly interface</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-lg mb-3">🎯 Mission</h4>
              <p className="text-gray-600">
                To democratize legal information and empower individuals and professionals 
                with AI-powered legal assistance that is fast, accurate, and reliable.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⚖️</span>
              <h1 className="text-xl font-bold text-gray-900">LexiBot</h1>
            </div>
            
            <nav className="flex space-x-1">
              {[
                { id: "home", icon: HomeIcon, label: "Home" },
                { id: "chat", icon: MessageSquareIcon, label: "Chat" },
                { id: "docs", icon: FileTextIcon, label: "Documents" },
                { id: "analytics", icon: BarChartIcon, label: "Analytics" },
                { id: "about", icon: InfoIcon, label: "About" }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === item.id
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <item.icon />
                  <span className="ml-2 hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8">
        {activeTab === "home" && renderHome()}
        {activeTab === "chat" && <ChatBot />}
        {activeTab === "docs" && renderDocs()}
        {activeTab === "analytics" && renderAnalytics()}
        {activeTab === "about" && renderAbout()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-600 text-sm">
            © 2025 LexiBot – AI Legal Assistant | Built with React & Modern Web Technologies
          </p>
        </div>
      </footer>
    </div>
  );
}