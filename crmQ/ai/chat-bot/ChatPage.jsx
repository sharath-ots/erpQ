"use client";
import { useState, useRef, useEffect } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleManualSubmit = async (e) => {
    e.preventDefault(); 
    if (!input.trim() || isLoading) return;

    const userMessage = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput(""); 
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "API Failed" }));
        throw new Error(errData.error || "API Route failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      let aiMessage = { id: (Date.now() + 1).toString(), role: "assistant", content: "" };
      setMessages((prev) => [...prev, aiMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        aiMessage.content += chunk;
        
        setMessages((prev) => [...prev.slice(0, -1), { ...aiMessage }]);
      }
    } catch (err) {
      console.error("Native Fetch Error:", err);
      setMessages((prev) => [
        ...prev, 
        { id: "err", role: "assistant", content: `Error: ${err.message}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] w-full bg-zinc-950 p-6 flex flex-col items-center font-sans overflow-hidden">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
        
        {/* Left Info Bento Box */}
        <div className="col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold">
                Q
              </div>
              <h1 className="text-xl font-medium tracking-tight text-white">erpQ Assistant</h1>
            </div>
            
            <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
              Query your Frappe & ERPNext knowledge base via local retrieval-augmented generation.
            </p>
            
            <div className="space-y-4">
              <div className="bg-zinc-950/50 border border-zinc-800/50 p-4 rounded-xl">
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">Active Model</span>
                <span className="text-sm text-zinc-300">llama3.2:1b (Local)</span>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/50 p-4 rounded-xl">
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">Embedding Vector</span>
                <span className="text-sm text-zinc-300">nomic-embed-text (768d)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Chat Bento Box */}
        <div className="col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col shadow-xl overflow-hidden relative">
          
          {/* Chat Messages Area */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
                <p className="text-sm">Ready to query the knowledge base.</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    m.role === "user" 
                      ? "bg-indigo-600 text-white rounded-br-none" 
                      : "bg-zinc-800 text-zinc-300 border border-zinc-700/50 rounded-bl-none"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 text-zinc-400 border border-zinc-700/50 rounded-2xl rounded-bl-none px-5 py-4 text-sm flex items-center gap-2 shadow-sm">
                  <div className="h-2 w-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-zinc-900 border-t border-zinc-800">
            <form onSubmit={handleManualSubmit} className="relative flex items-center">
              <input
                value={input} 
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Frappe server scripts or workflows..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-5 pr-28 py-4 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()} 
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors shadow-sm"
              >
                Send
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}