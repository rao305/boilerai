import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { StrictMode } from 'react'

// Initialize mock ELO API for development
import './services/mockEloAPI'

// Initialize ELO system test runner for development
import './services/eloSystemTest'

class SimpleErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if ((this.state as any).hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
          <h1>Something went wrong.</h1>
          <details>
            <summary>Error details</summary>
            <pre>{(this.state as any).error?.toString()}</pre>
          </details>
        </div>
      );
    }

    return (this.props as any).children;
  }
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SimpleErrorBoundary>
      <App />
    </SimpleErrorBoundary>
  </StrictMode>
);
