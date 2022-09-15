import React from 'react';
import ReactDOM from 'react-dom/client';
import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/core/styles';
import App from './App';
import theme from './theme';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root') as Element);
root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>
);
