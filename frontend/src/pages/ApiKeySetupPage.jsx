import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveKeysLocally } from '../store/userSlice';

export default function ApiKeySetupPage() {
  const dispatch = useDispatch();
  const apiKeys = useSelector((state) => state.user.apiKeys);
  const apiKeysVerified = useSelector((state) => state.user.apiKeysVerified);
  
  const [groqKey, setGroqKey] = useState(apiKeys.groq || '');
  
  const availableSources = [
    { id: 'serpapi', name: 'SerpAPI (Recommended)' },
    { id: 'searchapi', name: 'SearchAPI' },
    { id: 'jsearch', name: 'JSearch (RapidAPI)' },
    { id: 'linkedin_rapid', name: 'LinkedIn (RapidAPI)' }
  ];
  
  const [selectedSources, setSelectedSources] = useState({});
  const [scrapingKeys, setScrapingKeys] = useState({});

  // load initial selected sources from redux state
  useEffect(() => {
    const initialSelected = {};
    const initialKeys = {};
    
    apiKeys.scraping.forEach(s => {
      initialSelected[s.source] = true;
      initialKeys[s.source] = s.key;
    });
    
    setSelectedSources(initialSelected);
    setScrapingKeys(initialKeys);
  }, [apiKeys]);

  function handleSourceToggle(sourceId) {
    setSelectedSources(prev => ({ ...prev, [sourceId]: !prev[sourceId] }));
  }

  function handleScrapingKeyChange(sourceId, value) {
    setScrapingKeys(prev => ({ ...prev, [sourceId]: value }));
  }

  function handleSaveKeys() {
    // just formats the keys and saves them locally, no backend calls
    const formattedScrapingKeys = [];
    for (const sourceId in selectedSources) {
      if (selectedSources[sourceId]) {
        formattedScrapingKeys.push({
          source: sourceId,
          key: scrapingKeys[sourceId] || ''
        });
      }
    }
    
    dispatch(saveKeysLocally({
      groq: groqKey,
      scraping: formattedScrapingKeys
    }));
  }

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>setup your api keys</h1>
      <p>keys are saved locally in your browser and sent securely to the backend when needed.</p>
      
      {/* groq key section */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>groq api key</h3>
        <p style={{ fontSize: '14px', color: '#666' }}>used for all llm processing.</p>
        <input 
          type="password" 
          value={groqKey}
          onChange={(e) => setGroqKey(e.target.value)}
          placeholder="gsk_..."
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>

      {/* scraping keys section */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>job scraping sources</h3>
        <p style={{ fontSize: '14px', color: '#666' }}>greenhouse is always enabled for free. add others if you have them.</p>
        
        {availableSources.map(source => {
          return (
            <div key={source.id} style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                <input 
                  type="checkbox" 
                  checked={selectedSources[source.id] || false}
                  onChange={() => handleSourceToggle(source.id)}
                  style={{ marginRight: '10px' }}
                />
                {source.name}
              </label>
              
              {selectedSources[source.id] && (
                <input 
                  type="password" 
                  value={scrapingKeys[source.id] || ''}
                  onChange={(e) => handleScrapingKeyChange(source.id, e.target.value)}
                  placeholder="api key..."
                  style={{ width: '100%', padding: '8px', marginTop: '10px' }}
                />
              )}
            </div>
          );
        })}
      </div>

      <button 
        onClick={handleSaveKeys} 
        style={{ 
          padding: '10px 20px', 
          backgroundColor: '#0066cc', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px',
          cursor: 'pointer',
          width: '100%',
          fontSize: '16px'
        }}
      >
        save keys to browser
      </button>

      {apiKeysVerified && (
        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <p style={{ color: 'green', fontWeight: 'bold' }}>keys saved successfully!</p>
          <button 
            style={{ 
              padding: '12px 24px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            continue to dashboard
          </button>
        </div>
      )}
    </div>
  );
}
