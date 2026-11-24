import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  state = { error: null, retryKey: 0 };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error) {
    console.error('Page rendering failed:', error);
  }

  componentDidUpdate(previousProps) {
    if (previousProps.route !== this.props.route && this.state.error) this.setState({ error: null });
  }

  render() {
    if (this.state.error) return <main className="container content app-error" role="alert"><h1>This page could not load</h1><p className="muted">Your account and saved work are still safe. Try loading the page again.</p><button className="primary" onClick={() => this.setState((state) => ({ error: null, retryKey: state.retryKey + 1 }))}>Try again</button><button className="link" onClick={() => { window.location.hash = '#home'; this.setState({ error: null, retryKey: this.state.retryKey + 1 }); }}>Go to home</button></main>;
    return <div key={`${this.props.route}:${this.state.retryKey}`}>{this.props.children}</div>;
  }
}
