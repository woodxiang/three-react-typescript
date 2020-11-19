import React, { useEffect, useRef } from 'react';
import { WEBGL } from 'three/examples/jsm/WebGL';
import RenderingEngine from './RenderingEngine';

function init(newDiv: HTMLDivElement, renderEnv: RenderingEngine): void {
  const width = newDiv.clientWidth;
  const height = newDiv.clientHeight;

  renderEnv.init(newDiv, width, height);

  renderEnv.startAnimate();
}

function onResize(
  renderDiv: HTMLDivElement | null,
  renderEnv: RenderingEngine
) {
  if (!renderDiv) return;
  const width = renderDiv.clientWidth;
  const height = renderDiv.clientHeight;
  renderEnv.resize(width, height);
}

interface IRenderingViewProps {
  displayingSTL: ArrayBuffer | null;
}

export default function RenderingView(props: IRenderingViewProps): JSX.Element {
  const renderDiv = useRef<HTMLDivElement>(null);
  const renderEnv = useRef<RenderingEngine>(new RenderingEngine());

  const { displayingSTL } = props;

  useEffect(() => {
    if (renderDiv.current != null) {
      init(renderDiv.current, renderEnv.current);
      renderDiv.current?.addEventListener('resize', () => {
        onResize(renderDiv.current, renderEnv.current);
      });
      window.addEventListener('resize', () => {
        onResize(renderDiv.current, renderEnv.current);
      });
    }
  }, []);

  useEffect(() => {
    renderEnv.current.drawObject(displayingSTL);
  }, [displayingSTL]);

  if (!WEBGL.isWebGL2Available()) {
    return <div>WebGL Reauired.</div>;
  }

  return <div ref={renderDiv} />;
}
