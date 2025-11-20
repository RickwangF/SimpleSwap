import React from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const config = getDefaultConfig({
    appName: 'SimpleSwap',
    projectId: 'f43119e6c7b5d2d32da03bdc473ef23b',
    chains: [sepolia],
    ssr: false
});

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    { children }
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}