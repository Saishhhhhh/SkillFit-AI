import { createSlice } from '@reduxjs/toolkit';

// load keys from local storage if they exist
const savedKeys = JSON.parse(localStorage.getItem('skillfit_keys')) || {
  groq: '',
  scraping: []
};

const initialState = {
  user: null,
  session: null,
  apiKeys: savedKeys,
  apiKeysVerified: savedKeys.groq !== '',
  availableSources: savedKeys.scraping.map(s => s.source)
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setAuth: (state, action) => {
      state.user = action.payload.user;
      state.session = action.payload.session;
    },
    saveKeysLocally: (state, action) => {
      // payload is { groq: "key...", scraping: [{source: "serpapi", key: "..."}] }
      state.apiKeys = action.payload;
      state.apiKeysVerified = action.payload.groq !== '';
      state.availableSources = action.payload.scraping.map(s => s.source);
      
      // save to browser's local storage so they persist across refreshes
      localStorage.setItem('skillfit_keys', JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.user = null;
      state.session = null;
    }
  }
});

export const { setAuth, saveKeysLocally, logout } = userSlice.actions;

export default userSlice.reducer;
