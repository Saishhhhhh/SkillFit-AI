import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';

// The "store" is like a central database for our frontend application.
// It holds all the state that different components might need to share.
export const store = configureStore({
  reducer: {
    // We add our user slice to the store
    user: userReducer
  }
});
