"use client";
import Nav from "@/local/Nav";
import "@/styles/globals.css";
import { Web3ContextProvider } from "@/utils";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Web3ContextProvider>
      <Nav />
      <Component {...pageProps} />
    </Web3ContextProvider>
  );
}
