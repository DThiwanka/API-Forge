/**
 * Notification Store (Re-exports unified toastStore)
 * 
 * Provides backward compatibility and a single source of truth
 * for ephemeral application notifications.
 */
import { useToastStore, toast, TOAST_DURATIONS } from './toastStore.js';

export { useToastStore, toast, TOAST_DURATIONS };
export default useToastStore;
