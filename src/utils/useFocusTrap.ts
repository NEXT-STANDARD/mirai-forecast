import { useEffect, useRef } from 'react';

/**
 * ♿️ WAI-ARIA 準拠 フォーカストラップ・フック (WCAG 2.2 AAA)
 * モーダル表示時にフォーカスをモーダル内に閉じ込め、Tabキーの循環と閉じた後の元の要素へのフォーカス復帰を管理
 */
export function useFocusTrap(isOpen: boolean, onClose?: () => void) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusedElement = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  // 常に最新の onClose を保持（依存配列に入れない）
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    // 開く前のフォーカス要素を記録
    previousFocusedElement.current = document.activeElement as HTMLElement | null;

    const modal = modalRef.current;
    if (!modal) return;

    // フォーカス可能な要素を抽出
    const getFocusableElements = () => {
      if (!modalRef.current) return [];
      return Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
    };

    // 初期フォーカス設定: 既にモーダル内部にフォーカスがある場合は絶対に奪わない
    const isAlreadyInside = modal.contains(document.activeElement);
    if (!isAlreadyInside) {
      const focusables = getFocusableElements();
      // 入力欄（input/textarea）があれば優先、なければ最初の操作要素へ
      const preferredTarget = focusables.find(el => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') || focusables[0];
      if (preferredTarget) {
        // 微小ディレイでマウント完了後にフォーカス
        requestAnimationFrame(() => {
          if (modalRef.current && !modalRef.current.contains(document.activeElement)) {
            preferredTarget.focus();
          }
        });
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onCloseRef.current) {
          e.preventDefault();
          onCloseRef.current();
        }
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
      // モーダルが閉じたときにフォーカスを元の要素へ復帰
      if (previousFocusedElement.current && typeof previousFocusedElement.current.focus === 'function') {
        previousFocusedElement.current.focus();
      }
    };
  }, [isOpen]);

  return modalRef;
}
