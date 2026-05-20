'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
};

type Ctx = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = React.createContext<Ctx | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = React.useState<ConfirmOptions | null>(null);
  const resolverRef = React.useRef<((v: boolean) => void) | undefined>(undefined);

  const confirm = React.useCallback((options: ConfirmOptions) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = undefined;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={!!opts} onOpenChange={(o) => !o && close(false)}>
        <DialogContent>
          {opts && (
            <>
              <DialogHeader>
                <DialogTitle>{opts.title}</DialogTitle>
                {opts.description && <DialogDescription>{opts.description}</DialogDescription>}
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => close(false)}>
                  {opts.cancelLabel ?? 'Cancelar'}
                </Button>
                <Button variant={opts.variant ?? 'default'} onClick={() => close(true)}>
                  {opts.confirmLabel ?? 'Confirmar'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Ctx['confirm'] {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm fuera de ConfirmDialogProvider');
  return ctx.confirm;
}
