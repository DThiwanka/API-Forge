import { toast } from '../stores/toastStore.js';

/**
 * Standardized clipboard copy utility with graceful fallback and optional toast
 * 
 * @param {string} text - Content to copy to clipboard
 * @param {object} [options]
 * @param {string} [options.label='Copied to clipboard'] - Success message if toast enabled
 * @param {boolean} [options.notify=true] - Whether to show a toast notification
 * @returns {Promise<boolean>} True if copy succeeded
 */
export async function copyToClipboard(text, options = {}) {
  const { label = 'Copied to clipboard', notify = true } = options;

  if (!text && text !== '') {
    return false;
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers or non-secure contexts
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (!success) {
        throw new Error('execCommand copy failed');
      }
    }

    if (notify) {
      toast.success(label);
    }
    return true;
  } catch {
    if (notify) {
      toast.error('Failed to copy to clipboard');
    }
    return false;
  }
}

export default copyToClipboard;

