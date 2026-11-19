import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { emptyDraft, type FoundDraft } from './model';

const DraftContext = createContext<{
  draft: FoundDraft;
  update: (patch: Partial<FoundDraft>) => void;
  reset: () => void;
} | null>(null);

export function DraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState(emptyDraft);
  return <DraftContext.Provider value={{ draft, update: patch => setDraft(current => ({ ...current, ...patch })), reset: () => setDraft(emptyDraft()) }}>{children}</DraftContext.Provider>;
}

export function useFoundDraft() {
  const context = useContext(DraftContext);
  if (!context) throw new Error('Found draft must be used inside DraftProvider.');
  return context;
}
