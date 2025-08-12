import { useState } from "react";
import { PurdueButton, PurdueInput, Card } from "@/components/PurdueUI";

export default function ApiTest() {
  const [results, setResults] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState("");

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testLogin = async () => {
    try {
      addResult("🔑 Testing login...");
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: "testdev@purdue.edu",
          password: "password123"
        })
      });

      const data = await response.json();
      
      if (response.ok && data.token) {
        localStorage.setItem('token', data.token);
        addResult(`✅ Login successful! Token saved (${data.token.substring(0, 20)}...)`);
      } else {
        addResult(`❌ Login failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      addResult(`❌ Login error: ${error}`);
    }
  };

  const testApiKey = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        addResult("❌ No token found - login first!");
        return;
      }

      if (!apiKey.trim()) {
        addResult("❌ Please enter an API key!");
        return;
      }

      addResult("🔑 Testing API key save...");
      const response = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ apiKey })
      });

      const data = await response.json();
      
      if (response.ok) {
        addResult(`✅ API key saved successfully!`);
      } else {
        addResult(`❌ API key save failed: ${data.message || response.statusText}`);
      }
    } catch (error) {
      addResult(`❌ API key error: ${error}`);
    }
  };

  const testBackend = async () => {
    try {
      addResult("🔧 Testing backend health...");
      const response = await fetch('/api/health');
      const data = await response.json();
      
      if (response.ok) {
        addResult(`✅ Backend healthy: ${data.status}`);
      } else {
        addResult(`❌ Backend unhealthy: ${response.statusText}`);
      }
    } catch (error) {
      addResult(`❌ Backend error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">API Connection Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Tests">
            <div className="space-y-4">
              <PurdueButton onClick={testBackend} className="w-full">
                1. Test Backend Health
              </PurdueButton>
              
              <PurdueButton onClick={testLogin} className="w-full">
                2. Test Login
              </PurdueButton>
              
              <div className="space-y-2">
                <PurdueInput
                  placeholder="Enter your OpenAI API key (sk-...)"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <PurdueButton onClick={testApiKey} className="w-full">
                  3. Test API Key Save
                </PurdueButton>
              </div>
              
              <PurdueButton 
                onClick={() => setResults([])} 
                className="w-full"
              >
                Clear Results
              </PurdueButton>
            </div>
          </Card>

          <Card title="Results">
            <div className="space-y-2 max-h-96 overflow-y-auto text-sm">
              {results.length === 0 ? (
                <p className="text-neutral-400">No results yet. Run tests on the left.</p>
              ) : (
                results.map((result, index) => (
                  <div 
                    key={index} 
                    className="p-2 rounded font-mono ring-1 ring-neutral-800 bg-neutral-950/60"
                  >
                    {result}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}