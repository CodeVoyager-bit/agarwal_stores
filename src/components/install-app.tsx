"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { useT } from "./i18n";

type InstallPrompt = Event & { prompt: () => Promise<void> };
declare global {
  interface Window {
    /** Set by the root layout's inline script, whichever page the browser's install offer fires on. */
    __installPrompt?: InstallPrompt;
    __appInstalled?: boolean;
  }
}

function subscribe(change: () => void) {
  addEventListener("beforeinstallprompt", change);
  addEventListener("appinstalled", change);
  return () => {
    removeEventListener("beforeinstallprompt", change);
    removeEventListener("appinstalled", change);
  };
}

/** Opened as the installed app, or installed just now; offered by the browser; or neither (from Agarwal Online). */
function readState() {
  const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone || window.__appInstalled) return "installed";
  return window.__installPrompt ? "offer" : "none";
}
const useInstall = () => useSyncExternalStore(subscribe, readState, () => "none");

/**
 * The browser's own "Install app" (Chrome and Edge, on Android and computers), shown only when the
 * browser offers it; `children` are the steps for everywhere else (iPhone). Inside the app there's
 * nothing left to install.
 */
export function InstallApp({ children }: { children: ReactNode }) {
  const state = useInstall();
  const a = useT().app;
  // the browser's offer can be shown only once
  const [asked, setAsked] = useState(false);
  if (state === "installed")
    return (
      <p role="status" className="success">
        {a.installed}
      </p>
    );
  return (
    <>
      {state === "offer" && !asked && (
        <button
          type="button"
          className="btn primary big"
          onClick={() => {
            setAsked(true);
            void window.__installPrompt?.prompt();
          }}
        >
          <Download size={20} aria-hidden="true" /> {a.install}
        </button>
      )}
      {children}
    </>
  );
}

/** The way to the Get the App page, left out inside the app itself. */
export function AppLink({ className, children }: { className?: string; children: ReactNode }) {
  return useInstall() === "installed" ? null : (
    <Link href="/app" className={className}>
      {children}
    </Link>
  );
}
