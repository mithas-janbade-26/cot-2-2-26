import React, { useState, useRef, useEffect } from 'react';

function App() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  // CoT Modal state
  const [cotModal, setCotModal] = useState(null); // { item, messages, loading }
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);

  // Search panel state
  const [searchPanel, setSearchPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to process file. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [cotModal?.messages]);

  // Open CoT modal for an item
  const openCotModal = (item) => {
    setCotModal({
      item,
      messages: [],
      loading: false,
    });
    setChatInput("");
  };

  const closeCotModal = () => {
    setCotModal(null);
    setChatInput("");
  };

  // Send a chat message in the CoT modal
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !cotModal || cotModal.loading) return;

    const userMessage = chatInput.trim();
    setChatInput("");

    const updatedMessages = [...cotModal.messages, { role: "user", content: userMessage }];
    setCotModal(prev => ({ ...prev, messages: updatedMessages, loading: true }));

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier: cotModal.item.original.Supplier || "",
          material: cotModal.item.original.Material || "",
          description: cotModal.item.original.Description || "",
          amount: cotModal.item.original.Amount || 0,
          reasoning: cotModal.item.analysis.reasoning || "",
          messages: updatedMessages,
        }),
      });

      const data = await response.json();
      setCotModal(prev => ({
        ...prev,
        messages: [...updatedMessages, { role: "assistant", content: data.reply }],
        loading: false,
      }));
    } catch (error) {
      setCotModal(prev => ({
        ...prev,
        messages: [...updatedMessages, { role: "assistant", content: "Error: Could not reach the AI. Please try again." }],
        loading: false,
      }));
    }
  };

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  // Drag-and-drop for search
  const handleDragStart = (e, text) => {
    e.dataTransfer.setData('text/plain', text);
    e.dataTransfer.effectAllowed = 'copy';
    // Show search panel if not already open
    if (!searchPanel) setSearchPanel(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      setSearchQuery(text);
      performSearch(text);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const performSearch = async (query) => {
    if (!query.trim()) return;
    setSearchLoading(true);
    setSearchResults([]);

    try {
      const response = await fetch('http://localhost:8000/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  return (
    <div className={`app-layout ${searchPanel ? 'with-search-panel' : ''}`}>
      {/* Main content area */}
      <div className="main-content">
        <div className="container">
          <header>
            <div>
              <h1>SpendAnalyzer <span style={{ fontWeight: 300, fontSize: '0.9rem', color: 'var(--text-light)', marginLeft: '10px' }}>v2.0 Professional</span></h1>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>Enterprise Spend Categorization with Human-in-the-Loop AI Logic</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                className={`btn-search-toggle ${searchPanel ? 'active' : ''}`}
                onClick={() => setSearchPanel(!searchPanel)}
                title="Toggle search panel"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="M21 21l-4.35-4.35"></path>
                </svg>
                Search
              </button>
              <div className="upload-section" style={{ margin: 0, padding: '0.5rem 1rem' }}>
                <div className="file-input-wrapper">
                  <button className="btn-primary" style={{ fontSize: '0.8rem' }}>
                    {fileName ? fileName : "Upload Excel"}
                  </button>
                  <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ position: 'absolute', opacity: 0, left: 0, top: 0, width: '100%' }} />
                </div>
                {loading && <span className="loading-inline" style={{ marginLeft: '1rem' }}>Processing...</span>}
              </div>
            </div>
          </header>

          <p className="drag-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            Drag <strong>Supplier</strong> or <strong>Material</strong> cells to the search panel to look them up instantly
          </p>

          <table className="results-table">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Supplier</th>
                <th style={{ width: '20%' }}>Material / Description</th>
                <th style={{ width: '25%' }}>Primary Category</th>
                <th style={{ width: '25%' }}>Alternatives / Validation</th>
                <th style={{ width: '10%' }}>Confidence</th>
                <th style={{ width: '5%' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {results.map((item, index) => (
                <tr key={index}>
                  <td
                    className="supplier-cell draggable-cell"
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.original.Supplier || "")}
                    title="Drag to search panel"
                  >
                    <span className="drag-icon">&#x2630;</span>
                    {item.original.Supplier}
                  </td>
                  <td>
                    <strong
                      className="draggable-cell material-drag"
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.original.Material || "")}
                      title="Drag to search panel"
                    >
                      <span className="drag-icon">&#x2630;</span>
                      {item.original.Material}
                    </strong>
                    <span className="description-text">{item.original.Description}</span>
                  </td>
                  <td>
                    <span className="category-tag">{item.analysis.primary?.level1}</span>
                    <span className="category-tag">{item.analysis.primary?.level2}</span>
                    <div style={{ marginTop: '0.4rem', fontWeight: 600, color: 'var(--primary)' }}>
                      &rarr; {item.analysis.primary?.level3} {item.analysis.primary?.level4 ? `/ ${item.analysis.primary.level4}` : ''}
                    </div>
                  </td>
                  <td>
                    {item.analysis.alternative ? (
                      <div className="alt-category">
                        <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Maybe: </span>
                        {item.analysis.alternative.level3} {item.analysis.alternative.level4 ? `/ ${item.analysis.alternative.level4}` : ''}
                        <p style={{ fontSize: '0.7rem', marginTop: '2px' }}>{item.analysis.alternative.reason}</p>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.8rem' }}>No plausible alternatives found.</span>
                    )}
                  </td>
                  <td>
                    <div
                      className="confidence-clickable"
                      onClick={() => openCotModal(item)}
                      title="Click to view AI reasoning and chat"
                    >
                      <span className={`confidence-dot confidence-${item.analysis.confidence}`}></span>
                      <strong>{item.analysis.confidence}</strong>
                      <span className="cot-hint">View CoT</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    ${item.original.Amount?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {results.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '10rem', color: 'var(--text-light)' }}>
              <p>No data processed. Please upload an excel sheet to begin analysis.</p>
            </div>
          )}
        </div>
      </div>

      {/* Search Side Panel */}
      {searchPanel && (
        <div className="search-panel">
          <div className="search-panel-header">
            <h3>Web Search</h3>
            <button className="btn-close-panel" onClick={() => setSearchPanel(false)}>&times;</button>
          </div>

          <div
            className={`search-drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Drop supplier or material here</span>
          </div>

          <form className="search-form" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              className="search-input"
              placeholder="Or type a search query..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn-search" disabled={searchLoading}>
              {searchLoading ? '...' : 'Go'}
            </button>
          </form>

          <div className="search-results">
            {searchLoading && (
              <div className="search-loading">
                <div className="search-spinner"></div>
                Searching the web...
              </div>
            )}
            {!searchLoading && searchResults.length === 0 && searchQuery && (
              <p className="search-empty">No results found. Try a different query.</p>
            )}
            {searchResults.map((result, i) => (
              <a
                key={i}
                className="search-result-card"
                href={result.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="search-result-title">{result.title}</div>
                <div className="search-result-body">{result.body}</div>
                <div className="search-result-url">{result.href}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* CoT Modal */}
      {cotModal && (
        <div className="modal-overlay" onClick={closeCotModal}>
          <div className="cot-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cot-modal-header">
              <div>
                <h3>AI Reasoning &mdash; Chain of Thought</h3>
                <span className="cot-modal-subtitle">
                  {cotModal.item.original.Supplier} &bull; {cotModal.item.original.Material}
                </span>
              </div>
              <button className="btn-close-modal" onClick={closeCotModal}>&times;</button>
            </div>

            <div className="cot-modal-body">
              {/* Original reasoning */}
              <div className="cot-message cot-message-ai">
                <div className="cot-message-label">AI Reasoning</div>
                <div className="cot-message-content">{cotModal.item.analysis.reasoning}</div>
                <div className="cot-message-meta">
                  Confidence: <span className={`confidence-badge confidence-${cotModal.item.analysis.confidence}`}>{cotModal.item.analysis.confidence}</span>
                  &nbsp;&bull;&nbsp;
                  {cotModal.item.analysis.primary?.level1} &rarr; {cotModal.item.analysis.primary?.level3}
                  {cotModal.item.analysis.primary?.level4 ? ` / ${cotModal.item.analysis.primary.level4}` : ''}
                </div>
                {cotModal.item.analysis.confidence_reason && (
                  <div className="confidence-reason">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    {cotModal.item.analysis.confidence_reason}
                  </div>
                )}
              </div>

              {/* Conversation messages */}
              {cotModal.messages.map((msg, i) => (
                <div key={i} className={`cot-message cot-message-${msg.role === 'user' ? 'user' : 'ai'}`}>
                  <div className="cot-message-label">{msg.role === 'user' ? 'You' : 'AI Agent'}</div>
                  <div className="cot-message-content">{msg.content}</div>
                </div>
              ))}

              {cotModal.loading && (
                <div className="cot-message cot-message-ai">
                  <div className="cot-message-label">AI Agent</div>
                  <div className="cot-message-content cot-typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <div className="cot-modal-footer">
              <textarea
                className="cot-chat-input"
                placeholder="Ask about this categorization, challenge it, or request more detail..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                rows={2}
                disabled={cotModal.loading}
              />
              <button
                className="btn-send"
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || cotModal.loading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
