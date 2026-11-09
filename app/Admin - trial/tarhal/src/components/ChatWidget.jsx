import { useState } from "react";
import "./ChatWidget.css";

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "ai", text: "Hi! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isTyping) return;

    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInput("");
    setIsTyping(true);

    // Placeholder AI response — replace with your real API call later
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Thanks for your message! (AI response goes here)" },
      ]);
      setIsTyping(false);
    }, 600);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <span
        className="login-badge"
        role="img"
        aria-label="camel"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{ cursor: "pointer" }}
      >
        🐫
      </span>

      {isOpen && (
        <div className="chat-box">
          <div className="chat-header">
            <span>Terhal Assistant 🐫</span>
            <button className="chat-close" onClick={() => setIsOpen(false)}>
              ×
            </button>
          </div>

          <div className="chat-messages" aria-live="polite">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-message ${msg.sender === "user" ? "user" : "ai"}`}
              >
                {msg.text}
              </div>
            ))}

            {isTyping && (
              <div
                className="chat-message ai typing-indicator"
                role="status"
                aria-label="Assistant is typing"
              >
                <span aria-hidden="true" />
                <span aria-hidden="true" />
                <span aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="chat-input-row">
            <input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button onClick={handleSend} disabled={!input.trim() || isTyping}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatWidget;