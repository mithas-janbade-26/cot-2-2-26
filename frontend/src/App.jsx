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
        <div>
          <h1>SpendAnalyzer <span style={{ fontWeight: 300, fontSize: '0.9rem', color: 'var(--text-light)', marginLeft: '10px' }}>v2.0 Professional</span></h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>Enterprise Spend Categorization with Human-in-the-Loop AI Logic</p>
        </div>
        <div className="upload-section" style={{ margin: 0, padding: '0.5rem 1rem' }}>
          <div className="file-input-wrapper">
            <button className="btn-primary" style={{ fontSize: '0.8rem' }}>
              {fileName ? fileName : "Upload Excel"}
            </button>
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ position: 'absolute', opacity: 0, left: 0, top: 0, width: '100%' }} />
          </div>
          {loading && <span className="loading-inline" style={{ marginLeft: '1rem' }}>Processing...</span>}
        </div>
      </header>

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
              <td className="supplier-cell">{item.original.Supplier}</td>
              <td>
                <strong>{item.original.Material}</strong>
                <span className="description-text">{item.original.Description}</span>
              </td>
              <td>
                <span className="category-tag">{item.analysis.primary?.level1}</span>
                <span className="category-tag">{item.analysis.primary?.level2}</span>
                <div style={{ marginTop: '0.4rem', fontWeight: 600, color: 'var(--primary)' }}>
                  → {item.analysis.primary?.level3} {item.analysis.primary?.level4 ? `/ ${item.analysis.primary.level4}` : ''}
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
                <div className="tooltip-container">
                  <span className={`confidence-dot confidence-${item.analysis.confidence}`}></span>
                  <strong>{item.analysis.confidence}</strong>
                  <div className="tooltip-text">
                    <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '5px', textTransform: 'uppercase' }}>AI Reasoning (Linger to view)</div>
                    {item.analysis.reasoning}
                  </div>
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
  );
}

export default App;
