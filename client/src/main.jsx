import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
class Boundary extends React.Component {
  state = {
    error: false
  };
  static getDerivedStateFromError() {
    return {
      error: true
    };
  }
  render() {
    return this.state.error ? <main className="empty"><h1>We couldn’t display this page.</h1><p>Reload to recover your workspace.</p><button onClick={() => location.reload()}>Reload</button></main> : this.props.children;
  }
}
createRoot(document.getElementById('root')).render(<React.StrictMode><Boundary><App /></Boundary></React.StrictMode>);
