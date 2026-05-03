'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { useProjectStore } from '@/store/projectStore';
import { useSnap } from '@/hooks/useSnap';
import TextElement from '@/components/elements/TextElement';
import TextBoxElement from '@/components/elements/TextBoxElement';
import ImageElement from '@/components/elements/ImageElement';
import ArrowElement from '@/components/elements/ArrowElement';
import SelectionTransformer from '@/components/elements/SelectionTransformer';

export default function KonvaLayer({ stageRef, displayWidth, displayHeight, scale }) {
  const {
    elements,
    selectedId,
    setSelectedId,
    updateElement,
    canvasConfig,
    removeElement,
    duplicateElement,
    bringForward,
    sendBackward,
  } = useProjectStore();

  const [snapGuides, setSnapGuides] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const { snap } = useSnap(canvasConfig.baseWidth, canvasConfig.baseHeight);

  // Sort elements by zIndex
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  // Delete / Backspace removes selected element (unless a text input has focus)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      const { selectedId, removeElement } = useProjectStore.getState();
      if (selectedId) removeElement(selectedId);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStageClick = useCallback((e) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
    }
    setContextMenu(null);
  }, [setSelectedId]);

  const handleDragMove = useCallback((id, e) => {
    const el = elements.find((el) => el.id === id);
    if (!el) return;

    // Convert display coords to design coords
    const designX = e.target.x() / scale;
    const designY = e.target.y() / scale;

    const { snappedX, snappedY, guides } = snap(
      { x: designX, y: designY },
      { ...el, x: designX, y: designY },
      elements
    );

    // Apply snap in display coords
    e.target.x(snappedX * scale);
    e.target.y(snappedY * scale);

    setSnapGuides(guides);
  }, [elements, scale, snap]);

  const handleDragEnd = useCallback((id, e) => {
    const designX = e.target.x() / scale;
    const designY = e.target.y() / scale;
    updateElement(id, { x: designX, y: designY });
    setSnapGuides([]);
  }, [scale, updateElement]);

  const handleTransformEnd = useCallback((id, node) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    // Use the stored element's design-space width/height as base — avoids Group.width() = 0 bug
    const el = useProjectStore.getState().elements.find((e) => e.id === id);
    const baseW = (node.width() > 0 ? node.width() : (el?.width ?? 100) * scale);
    const baseH = (node.height() > 0 ? node.height() : (el?.height ?? 100) * scale);
    const newWidth = Math.max(10, baseW * scaleX) / scale;
    const newHeight = Math.max(10, baseH * scaleY) / scale;
    const newX = node.x() / scale;
    const newY = node.y() / scale;

    node.scaleX(1);
    node.scaleY(1);

    updateElement(id, {
      x: newX, y: newY,
      width: newWidth, height: newHeight,
      rotation: node.rotation(),
    });
  }, [scale, updateElement]);

  const handleContextMenu = useCallback((id, e) => {
    e.evt.preventDefault();
    setSelectedId(id);
    setContextMenu({ id, x: e.evt.clientX, y: e.evt.clientY });
  }, [setSelectedId]);

  // Close context menu on outside click
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const renderElement = (el) => {
    const props = {
      element: el,
      scale,
      isSelected: selectedId === el.id,
      onSelect: () => setSelectedId(el.id),
      onDragMove: (e) => handleDragMove(el.id, e),
      onDragEnd: (e) => handleDragEnd(el.id, e),
      onTransformEnd: (node) => handleTransformEnd(el.id, node),
      onContextMenu: (e) => handleContextMenu(el.id, e),
    };

    switch (el.type) {
      case 'text':    return <TextElement key={el.id} {...props} />;
      case 'textbox': return <TextBoxElement key={el.id} {...props} />;
      case 'image':   return <ImageElement key={el.id} {...props} />;
      case 'arrow':   return <ArrowElement key={el.id} {...props} />;
      default:        return null;
    }
  };

  return (
    <>
      <Stage
        ref={stageRef}
        width={displayWidth}
        height={displayHeight}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        <Layer>
          {sortedElements.map(renderElement)}

          {/* Snap guide lines */}
          {snapGuides.map((guide, i) =>
            guide.x !== undefined ? (
              <Line
                key={`guide-${i}`}
                points={[guide.x * scale, 0, guide.x * scale, displayHeight]}
                stroke="#ef4444"
                strokeWidth={1}
                dash={[4, 4]}
                listening={false}
              />
            ) : (
              <Line
                key={`guide-${i}`}
                points={[0, guide.y * scale, displayWidth, guide.y * scale]}
                stroke="#ef4444"
                strokeWidth={1}
                dash={[4, 4]}
                listening={false}
              />
            )
          )}

          {/* Selection transformer */}
          {selectedId && (
            <SelectionTransformer
              stageRef={stageRef}
              selectedId={selectedId}
            />
          )}
        </Layer>
      </Stage>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#222] border border-[#333] rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { label: 'Duplicate', action: () => duplicateElement(contextMenu.id) },
            { label: 'Bring Forward', action: () => bringForward(contextMenu.id) },
            { label: 'Send Backward', action: () => sendBackward(contextMenu.id) },
            { label: 'Delete', action: () => removeElement(contextMenu.id), danger: true },
          ].map(({ label, action, danger }) => (
            <button
              key={label}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-[#333] transition-colors ${danger ? 'text-red-400' : 'text-gray-200'}`}
              onClick={() => { action(); setContextMenu(null); }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
