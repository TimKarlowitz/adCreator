'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Group, Rect, Transformer } from 'react-konva';
import { useProjectStore } from '@/store/projectStore';
import { useSnap } from '@/hooks/useSnap';
import TextElement from '@/components/elements/TextElement';
import TextBoxElement from '@/components/elements/TextBoxElement';
import ImageElement from '@/components/elements/ImageElement';
import ArrowElement from '@/components/elements/ArrowElement';
import SelectionTransformer from '@/components/elements/SelectionTransformer';

/**
 * KonvaLayer renders a set of canvas elements on a Konva Stage.
 *
 * Props:
 *   stageRef      – ref attached to the Konva Stage (required for interactive layer)
 *   displayWidth  – px width of the stage
 *   displayHeight – px height of the stage
 *   scale         – design-space to display-space scale factor
 *   elements      – array of elements to render (overrides store)
 *   interactive   – when false, renders read-only (no drag/select/context-menu)
 */
export default function KonvaLayer({
  stageRef,
  displayWidth,
  displayHeight,
  scale,
  elements: elementsProp,
  interactive = true,
  hitOnlyIds = null,
}) {
  const {
    elements: storeElements,
    selectedId,
    setSelectedId,
    updateElement,
    canvasConfig,
    removeElement,
    duplicateElement,
    bringForward,
    sendBackward,
    model3d,
    updateModel3d,
  } = useProjectStore();

  const elements = elementsProp ?? storeElements;

  const [snapGuides, setSnapGuides] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const { snap } = useSnap(canvasConfig.baseWidth, canvasConfig.baseHeight);

  // Sort elements by zIndex
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  // ---- 3D Model overlay (drag + scale in canvas) ----
  const model3dZIndex = model3d?.zIndex ?? -1;
  const modelSrc = model3d?.assetId || model3d?.src;
  const isModelSelected = selectedId === '__model3d__';

  // Overlay size: fixed 10% of the shorter canvas edge — just large enough to click
  // and drag comfortably without obscuring other elements or appearing as a big box
  // around the model. Scale changes the 3D model but not this hit/drag handle size.
  const overlayDisplaySize = Math.min(displayWidth, displayHeight) * 0.10;
  const overlayX = (model3d?.position?.x ?? 0.5) * displayWidth - overlayDisplaySize / 2;
  const overlayY = (model3d?.position?.y ?? 0.5) * displayHeight - overlayDisplaySize / 2;

  const modelTransformerRef = useRef();

  // Attach / detach the model transformer whenever selection changes
  useEffect(() => {
    if (!interactive || !modelTransformerRef.current || !stageRef?.current) return;
    if (isModelSelected) {
      const node = stageRef.current.findOne('#__model3d__');
      if (node) {
        modelTransformerRef.current.nodes([node]);
        modelTransformerRef.current.getLayer().batchDraw();
      }
    } else {
      modelTransformerRef.current.nodes([]);
      modelTransformerRef.current.getLayer()?.batchDraw();
    }
  }, [isModelSelected, interactive, stageRef]);

  const handleModelDragEnd = useCallback((e) => {
    const newCenterX = e.target.x() + overlayDisplaySize / 2;
    const newCenterY = e.target.y() + overlayDisplaySize / 2;
    updateModel3d({
      position: {
        x: Math.max(0, Math.min(1, newCenterX / displayWidth)),
        y: Math.max(0, Math.min(1, newCenterY / displayHeight)),
      },
    });
  }, [overlayDisplaySize, displayWidth, displayHeight, updateModel3d]);

  const handleModelTransformEnd = useCallback((e) => {
    const node = e.target;
    const sx = node.scaleX();
    const sy = node.scaleY();
    // Use average of X/Y scale since the 3D model uses uniform scale
    const newScale = Math.max(0.1, (model3d?.scale ?? 1) * ((sx + sy) / 2));
    const newCenterX = node.x() + overlayDisplaySize * sx / 2;
    const newCenterY = node.y() + overlayDisplaySize * sy / 2;
    // Reset Konva transform; the store drives the rect on next render
    node.scaleX(1);
    node.scaleY(1);
    updateModel3d({
      scale: newScale,
      position: {
        x: Math.max(0, Math.min(1, newCenterX / displayWidth)),
        y: Math.max(0, Math.min(1, newCenterY / displayHeight)),
      },
    });
  }, [overlayDisplaySize, displayWidth, displayHeight, model3d?.scale, updateModel3d]);

  // Delete / Backspace removes selected element (unless a text input has focus)
  useEffect(() => {
    if (!interactive) return;
    const handleKeyDown = (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      const { selectedId, removeElement } = useProjectStore.getState();
      if (selectedId) removeElement(selectedId);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interactive]);

  const handleStageClick = useCallback((e) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
    }
    setContextMenu(null);
  }, [setSelectedId]);

  const handleDragMove = useCallback((id, e) => {
    const el = elements.find((el) => el.id === id);
    if (!el) return;

    const designX = e.target.x() / scale;
    const designY = e.target.y() / scale;

    const { snappedX, snappedY, guides } = snap(
      { x: designX, y: designY },
      { ...el, x: designX, y: designY },
      elements
    );

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
    if (!interactive) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [interactive]);

  const renderElement = (el) => {
    if (!interactive) {
      // Read-only: render without any event handlers
      const props = {
        element: el,
        scale,
        isSelected: false,
        onSelect: () => {},
        onDragMove: () => {},
        onDragEnd: () => {},
        onTransformEnd: () => {},
        onContextMenu: () => {},
      };
      switch (el.type) {
        case 'text':    return <TextElement key={el.id} {...props} />;
        case 'textbox': return <TextBoxElement key={el.id} {...props} />;
        case 'image':   return <ImageElement key={el.id} {...props} />;
        case 'arrow':   return <ArrowElement key={el.id} {...props} />;
        default:        return null;
      }
    }

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

    const isHitOnly = hitOnlyIds?.has(el.id) ?? false;

    // Elements below the 3D model are rendered invisible here (their visual lives
    // in the bottom stage) but Konva's hit canvas still detects clicks on
    // opacity=0 groups, so drag and selection work for all elements regardless of
    // layer order.
    if (isHitOnly) {
      let inner;
      switch (el.type) {
        case 'text':    inner = <TextElement {...props} />; break;
        case 'textbox': inner = <TextBoxElement {...props} />; break;
        case 'image':   inner = <ImageElement {...props} />; break;
        case 'arrow':   inner = <ArrowElement {...props} />; break;
        default:        return null;
      }
      return <Group key={el.id} opacity={0}>{inner}</Group>;
    }

    switch (el.type) {
      case 'text':    return <TextElement key={el.id} {...props} />;
      case 'textbox': return <TextBoxElement key={el.id} {...props} />;
      case 'image':   return <ImageElement key={el.id} {...props} />;
      case 'arrow':   return <ArrowElement key={el.id} {...props} />;
      default:        return null;
    }
  };

  if (!interactive) {
    return (
      <Stage
        ref={stageRef}
        width={displayWidth}
        height={displayHeight}
        listening={false}
      >
        <Layer>
          {sortedElements.map(renderElement)}
        </Layer>
      </Stage>
    );
  }

  // Build an ordered render list that interleaves elements + the 3D model overlay
  // at the correct z-index position so hit detection respects the layer stack.
  const orderedRenderItems = (() => {
    const items = [];
    let modelInserted = false;
    for (const el of sortedElements) {
      if (!modelInserted && el.zIndex >= model3dZIndex) {
        items.push({ kind: 'model' });
        modelInserted = true;
      }
      items.push({ kind: 'element', el });
    }
    if (!modelInserted) items.push({ kind: 'model' });
    return items;
  })();

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
          {orderedRenderItems.map((item) => {
            if (item.kind === 'model') {
              if (!modelSrc) return null;
              // Invisible rect that acts as the drag/scale handle for the 3D model.
              // fill must have a tiny opacity so Konva's hit canvas detects clicks;
              // fully transparent fills have no hit area in Konva.
              return (
                <Rect
                  key="__model3d__"
                  id="__model3d__"
                  x={overlayX}
                  y={overlayY}
                  width={overlayDisplaySize}
                  height={overlayDisplaySize}
                  fill="rgba(255,255,255,0.001)"
                  draggable
                  onClick={() => setSelectedId('__model3d__')}
                  onTap={() => setSelectedId('__model3d__')}
                  onDragEnd={handleModelDragEnd}
                  onTransformEnd={handleModelTransformEnd}
                />
              );
            }
            return renderElement(item.el);
          })}

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

          {/* Transformer for regular elements */}
          {selectedId && selectedId !== '__model3d__' && (
            <SelectionTransformer
              stageRef={stageRef}
              selectedId={selectedId}
            />
          )}

          {/* Dedicated transformer for the 3D model — rotation disabled since
              the model has its own auto-rotate controls in the sidebar */}
          <Transformer
            ref={modelTransformerRef}
            rotateEnabled={false}
            keepRatio={true}
            anchorStroke="#6366f1"
            anchorFill="#fff"
            anchorSize={8}
            borderStroke="#6366f1"
            borderDash={[4, 4]}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 20 || newBox.height < 20) return oldBox;
              return newBox;
            }}
          />
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
