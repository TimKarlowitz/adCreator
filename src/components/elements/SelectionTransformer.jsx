'use client';

import { useRef, useEffect } from 'react';
import { Transformer } from 'react-konva';

export default function SelectionTransformer({ stageRef, selectedId }) {
  const transformerRef = useRef();

  useEffect(() => {
    if (!transformerRef.current || !stageRef?.current) return;
    const stage = stageRef.current;
    const selectedNode = stage.findOne(`#${selectedId}`);
    if (selectedNode) {
      transformerRef.current.nodes([selectedNode]);
      transformerRef.current.getLayer().batchDraw();
    } else {
      transformerRef.current.nodes([]);
    }
  }, [selectedId, stageRef]);

  return (
    <Transformer
      ref={transformerRef}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 20 || newBox.height < 20) return oldBox;
        return newBox;
      }}
      anchorStroke="#6366f1"
      anchorFill="#fff"
      anchorSize={8}
      borderStroke="#6366f1"
      borderDash={[4, 4]}
      rotateEnabled={true}
    />
  );
}
