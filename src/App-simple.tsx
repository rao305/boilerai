import React from 'react';

function App() {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#B8860B', marginBottom: '20px' }}>
          🚂 BoilerAI - Simple Test Mode
        </h1>
        
        <p>If you can see this page, the React app is working!</p>
        
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f8ff', border: '1px solid #007bff', borderRadius: '5px' }}>
          <h3>✅ React is Working</h3>
          <p>This means the issue might be with the complex main app components.</p>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <h3>Next Steps:</h3>
          <ol>
            <li>Check browser console for any errors</li>
            <li>Verify all environment variables are loaded</li>
            <li>Check if all dependencies are installed</li>
          </ol>
        </div>
        
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '5px' }}>
          <strong>Environment Check:</strong>
          <ul>
            <li>Backend URL: {import.meta.env.VITE_BACKEND_URL || 'NOT SET'}</li>
            <li>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET'}</li>
            <li>Node ENV: {import.meta.env.NODE_ENV || 'NOT SET'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;