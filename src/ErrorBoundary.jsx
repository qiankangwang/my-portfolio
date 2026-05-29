import { Component } from "react";
import D from "./data";

/* Class-based error boundary — React 19 still has no hook equivalent.
   A single uncaught render error would otherwise blank the whole page
   (and the <noscript> fallback can't rescue it, since JS has already
   mounted). On failure we degrade to a minimal static card mirroring
   the no-JS fallback: name, tagline, and contact links. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Surface in the console for debugging; no telemetry on a static site.
    console.error("Portfolio render error:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="error-fallback" role="alert">
        <h1>{D.fullName}</h1>
        <p>{D.tagline}</p>
        <p>
          <a href={`mailto:${D.email}`}>{D.email}</a>
          {" · "}
          <a href={D.github} target="_blank" rel="noopener noreferrer">GitHub</a>
          {" · "}
          <a href={D.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </p>
        <p>
          <small>Something went wrong loading the interactive site. Please reload.</small>
        </p>
      </div>
    );
  }
}
