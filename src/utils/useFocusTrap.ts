import { useEffect, useRef } from 'react';

/**
 * ♿️ WAI-ARIA 準拠 フォーカストラップ・フック (WCAG 2.2 AAA)
 * モーダル表示時にフォーカスをモーダル内に閉じ込め、Tabキーの循環と閉じた後の元の要素へのフォーカス復帰を管理
 */
export function useFocusTrap(isOpen: boolean, onClose?: () => void) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // 開く前のフォーカス要素を記録
    previousFocusedElement.current = document.activeElement as HTMLElement | null;

    const modal = modalRef.current;
    if (!modal) return;

    // フォーカス可能な要素を抽出
    const getFocusableElements = () => {
      return modal.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
    };

    const focusables = getFocusableElements();
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onClose) onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab: 最初の要素から戻る場合は最後の要素へ
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: 最後の要素から進む場合は最初の要素へ
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // モーダルが閉じたときにフォーカスを復帰
      if (previousFocusedElement.current && typeof previousFocusedElement.current.focus === 'function') {
        previousFocusedElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  return modalRef;
}
