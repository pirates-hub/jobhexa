import { useState } from 'react';

function renderWithLinks(text) {
  const parts = text.split(/(\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    const match = part.match(/\[(.*?)\]\((.*?)\)/);
    if (match) {
      return <a key={i} href={match[2]} className="text-primary-600 hover:underline font-medium">{match[1]}</a>;
    }
    return <span key={i} className="whitespace-pre-wrap">{part}</span>;
  });
}

function ChatBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setMessages([...messages, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.data?.reply || 'AI placeholder response' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'AI unreachable. Check server is running and GROQ_API_KEY is set in server/.env.' }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 max-w-md">
      <h3 className="font-bold mb-3">JobHexa AI Assistant</h3>
      <div className="h-64 overflow-y-auto space-y-2 mb-3 bg-gray-50 p-3 rounded">
        {messages.length === 0 && <p className="text-sm text-gray-500">Ask about jobs, eligibility, or preparation!</p>}
        {messages.map((m, i) => (
          <div key={i} className={`text-sm p-2 rounded whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary-100 ml-8' : 'bg-white mr-8 border'}`}>{renderWithLinks(m.text)}</div>
        ))}
        {loading && <p className="text-xs text-gray-400">AI thinking...</p>}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Ask something..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <button onClick={sendMessage} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm">Send</button>
      </div>
    </div>
  );
}
export default ChatBot;
