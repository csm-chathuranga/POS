import { configureStore } from '@reduxjs/toolkit';
import { api }            from './baseApi';
import authReducer        from '../features/auth/authSlice';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
  },
  middleware: gDM => gDM().concat(api.middleware),
});
