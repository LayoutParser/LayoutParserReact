import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import './ResizableSplit.css';

/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- O padrão WAI-ARIA de window splitter usa `separator` focável com teclado e ponteiro. */

type SplitDirection = 'columns' | 'rows';

interface ResizableSplitProps {
  className?: string;
  direction: SplitDirection;
  primary: ReactNode;
  primaryLabel: string;
  secondary: ReactNode;
  secondaryLabel: string;
  handleLabel: string;
  handleText: string;
  storageKey: string;
  defaultSize: number;
  minSize: number;
  maxSize: number;
}

type SplitStyle = CSSProperties & { '--resizable-primary-size': string };

const STORAGE_PREFIX = 'layoutParser.panelSize.';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const readPersistedSize = (
  storageKey: string,
  defaultSize: number,
  minSize: number,
  maxSize: number
): number => {
  try {
    const storedValue = Number.parseFloat(
      localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`) ?? ''
    );
    return Number.isFinite(storedValue) ? clamp(storedValue, minSize, maxSize) : defaultSize;
  } catch {
    return defaultSize;
  }
};

/**
 * Divide dois painéis com ajuste por arraste ou teclado. O percentual escolhido fica apenas no
 * navegador; nenhuma preferência visual é enviada ao back-end.
 */
const ResizableSplit: React.FC<ResizableSplitProps> = ({
  className = '',
  direction,
  primary,
  primaryLabel,
  secondary,
  secondaryLabel,
  handleLabel,
  handleText,
  storageKey,
  defaultSize,
  minSize,
  maxSize,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const componentId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [primarySize, setPrimarySize] = useState(() =>
    readPersistedSize(storageKey, defaultSize, minSize, maxSize)
  );

  const updateSize = useCallback(
    (nextSize: number) => setPrimarySize(clamp(nextSize, minSize, maxSize)),
    [maxSize, minSize]
  );

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, String(primarySize));
    } catch {
      // Preferência visual é opcional; a interface continua funcional sem localStorage.
    }
  }, [primarySize, storageKey]);

  const updateFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== event.pointerId || !rootRef.current) return;

    const bounds = rootRef.current.getBoundingClientRect();
    const totalSize = direction === 'columns' ? bounds.width : bounds.height;
    const pointerOffset =
      direction === 'columns' ? event.clientX - bounds.left : event.clientY - bounds.top;

    if (totalSize <= 0) return;
    updateSize((pointerOffset / totalSize) * 100);
  };

  const finishPointerResize = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== event.pointerId) return;
    activePointerId.current = null;
    setIsDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 1 : 5;
    const decreaseKey = direction === 'columns' ? 'ArrowLeft' : 'ArrowUp';
    const increaseKey = direction === 'columns' ? 'ArrowRight' : 'ArrowDown';

    if (event.key === decreaseKey) {
      event.preventDefault();
      updateSize(primarySize - step);
    } else if (event.key === increaseKey) {
      event.preventDefault();
      updateSize(primarySize + step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      updateSize(minSize);
    } else if (event.key === 'End') {
      event.preventDefault();
      updateSize(maxSize);
    }
  };

  const roundedSize = Math.round(primarySize);
  const primaryId = `${componentId}-primary`;
  const secondaryId = `${componentId}-secondary`;
  const style: SplitStyle = { '--resizable-primary-size': `${primarySize}%` };

  return (
    <div
      ref={rootRef}
      className={`resizable-split resizable-split--${direction} ${isDragging ? 'is-dragging' : ''} ${className}`.trim()}
      style={style}
    >
      <div
        id={primaryId}
        className="resizable-split__panel resizable-split__panel--primary"
        aria-label={primaryLabel}
      >
        {primary}
      </div>
      <div
        className="resizable-split__handle"
        role="separator"
        aria-label={handleLabel}
        aria-controls={`${primaryId} ${secondaryId}`}
        aria-orientation={direction === 'columns' ? 'vertical' : 'horizontal'}
        aria-valuemin={minSize}
        aria-valuemax={maxSize}
        aria-valuenow={roundedSize}
        aria-valuetext={`${roundedSize}% para ${primaryLabel}`}
        tabIndex={0}
        title="Arraste, use as setas ou clique duas vezes para restaurar o tamanho padrão"
        onDoubleClick={() => updateSize(defaultSize)}
        onKeyDown={handleKeyDown}
        onPointerDown={event => {
          activePointerId.current = event.pointerId;
          setIsDragging(true);
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={updateFromPointer}
        onPointerUp={finishPointerResize}
        onPointerCancel={finishPointerResize}
        onLostPointerCapture={() => {
          activePointerId.current = null;
          setIsDragging(false);
        }}
      >
        <span className="resizable-split__grip" aria-hidden="true" />
        <span className="resizable-split__handle-text" aria-hidden="true">
          {handleText}
        </span>
        <span className="resizable-split__value" aria-hidden="true">
          {roundedSize}%
        </span>
      </div>
      <div
        id={secondaryId}
        className="resizable-split__panel resizable-split__panel--secondary"
        aria-label={secondaryLabel}
      >
        {secondary}
      </div>
    </div>
  );
};

export default ResizableSplit;
