import React from 'react';
import ConsentCraftEngine from './components/ConsentCraftEngine';

const App = () => {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50">
      {/* Ambient gradient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-purple-500/25 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-[-4rem] h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute top-1/3 right-[-6rem] h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Sticky application shell header */}
        <header className="sticky top-0 z-30 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-500 to-sky-500 shadow-lg shadow-purple-500/40">
                <span className="text-xs font-semibold tracking-[0.18em] text-slate-50">
                  CCE
                </span>
                <span className="pointer-events-none absolute inset-px rounded-[18px] border border-white/20" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold tracking-tight text-slate-50 sm:text-base">
                  Consent Craft Engine
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 shadow-sm shadow-emerald-500/30">
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_0_3px_rgba(34,197,94,0.35)]" />
                Privacy-first by design
              </span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1">
          <div className="mx-auto max-w-6xl px-4 pt-8 pb-10 sm:px-6 lg:px-8">
            <ConsentCraftEngine />
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/70 bg-slate-950/90">
          <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-slate-500 sm:px-6 sm:text-sm">
            Built for Data Privacy &amp; Consent Management •{' '}
            <span className="font-semibold text-indigo-300">Made by Satyam Singh</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;