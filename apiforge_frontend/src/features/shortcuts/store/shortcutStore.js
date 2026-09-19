import { create } from 'zustand';
import { SHORTCUT_SCOPES } from '../constants/shortcutRegistry.js';

export const useShortcutStore = create((set, get) => ({
  // Scope Stack: starts with global
  scopeStack: [SHORTCUT_SCOPES.GLOBAL],

  // Push an active scope onto the stack (e.g. dialog, request, canvas)
  pushScope: (scope) => {
    if (!scope) return;
    set((state) => ({
      scopeStack: [...state.scopeStack, scope],
    }));
  },

  // Pop a scope from the stack
  popScope: (scope) => {
    if (!scope) return;
    set((state) => {
      const idx = state.scopeStack.lastIndexOf(scope);
      if (idx <= 0) return state; // Never remove the base global scope
      const nextStack = [...state.scopeStack];
      nextStack.splice(idx, 1);
      return { scopeStack: nextStack };
    });
  },

  // Get highest priority current scope
  getCurrentScope: () => {
    const stack = get().scopeStack;
    return stack[stack.length - 1] || SHORTCUT_SCOPES.GLOBAL;
  },

  // Keyboard Shortcuts Cheat Sheet Modal
  isHelpModalOpen: false,
  openHelpModal: () => set({ isHelpModalOpen: true }),
  closeHelpModal: () => set({ isHelpModalOpen: false }),
  toggleHelpModal: () => set((state) => ({ isHelpModalOpen: !state.isHelpModalOpen })),
}));

export default useShortcutStore;
