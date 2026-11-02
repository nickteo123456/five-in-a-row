'use client';

import { AuthProvider } from './auth-provider';
import { GameProvider } from './game-provider';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <GameProvider>
        {children}
      </GameProvider>
    </AuthProvider>
  );
}

