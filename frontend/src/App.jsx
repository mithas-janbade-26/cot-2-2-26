import React, { useState } from 'react';

function App() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

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

  return (
    <div className="container">
      <header>
        <h1>SpendAnalyzer <span style={{ fontSize: '1rem', fontWeight: 400, opacity: 0.7 }}>with CoT Visibility</span></h1>
        <p style={{ color: 'var(--text-muted)' }}>Upload your invoice data and see the AI's logic behind every categorization.</p>
      </header>

      <div className="upload-section">
        <div className="file-input-wrapper">
          <button className="btn-primary">
            {fileName ? `Selected: ${fileName}` : "Upload Excel Sheet"}
          </button>
          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
        </div>
        {loading && <div className="loading-spinner"></div>}
      </div>

      <div className="results-grid">
        {results.map((item, index) => (
          <div key={index} className="result-card" style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="result-header">
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.5rem' }}>
                  <div>
                    <span className="cot-title" style={{ marginBottom: '0' }}>Supplier</span>
                    <div className="supplier-name">{item.original.Supplier}</div>
                  </div>
                  <div>
                    <span className="cot-title" style={{ marginBottom: '0' }}>Material</span>
                    <div style={{ fontWeight: 600 }}>{item.original.Material}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <span className="cot-title" style={{ display: 'inline', marginRight: '0.5rem' }}>Description:</span>
                  {item.original.Description}
                </div>
              </div>
              <div className="amount" style={{ textAlign: 'right' }}>
                <span className="cot-title" style={{ display: 'block', marginBottom: '0.25rem' }}>Amount</span>
                ${item.original.Amount?.toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="category-badge">{item.analysis.level1}</span>
                <span className="category-badge">{item.analysis.level2}</span>
                <span className="category-badge" style={{ background: 'rgba(34, 211, 238, 0.2)', color: 'var(--accent)' }}>{item.analysis.level3}</span>
              </div>
              <div style={{
                color: item.analysis.confidence === 'High' ? 'var(--success)' : (item.analysis.confidence === 'Medium' ? '#fbbf24' : '#f87171'),
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                Confidence: {item.analysis.confidence}
              </div>
            </div>

            <div className="cot-section">
              <div className="cot-title">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Chain of Thought Reasoning
              </div>
              <div className="cot-content">
                {item.analysis.reasoning}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
