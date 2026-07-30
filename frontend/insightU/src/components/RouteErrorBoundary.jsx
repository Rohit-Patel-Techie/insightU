import { Component } from "react";

export class RouteErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error("Route failed to load", error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            This page could not load
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            The application may have been updated while this tab was open.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 h-10 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white"
          >
            Reload application
          </button>
        </div>
      </main>
    );
  }
}
