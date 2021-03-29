import { createStyles, makeStyles } from '@material-ui/core';
import React, { useEffect, useMemo, useRef } from 'react';
import { WEBGL } from 'three/examples/jsm/WebGL';
import RenderingEngine from './RenderingEngine';

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      position: 'relative',
      width: '100%',
      height: '100%',
    },
  })
);

function init(newDiv: HTMLDivElement, renderEnv: RenderingEngine): void {
  const width = newDiv.clientWidth;
  const height = newDiv.clientHeight;

  newDiv.addEventListener('contextmenu', (e) => e.preventDefault());

  renderEnv.init(newDiv, width, height);

  renderEnv.startAnimate();
}

function onResize(renderDiv: HTMLDivElement | null, renderEnv: RenderingEngine) {
  if (!renderDiv) return;
  const width = renderDiv.clientWidth;
  const height = renderDiv.clientHeight;
  renderEnv.resize(width, height);
}

interface IRenderingViewProps {
  /**
   * each time the callback function need to compare with previous value.
   */
  engineCallback: (engine: RenderingEngine | undefined) => void;
}

export default function RenderingView(props: IRenderingViewProps): JSX.Element {
  const renderDiv = useRef<HTMLDivElement>(null);
  const renderEnv = useMemo<RenderingEngine>(() => new RenderingEngine(), []);

  const classes = useStyles();

  const { engineCallback } = props;

  useEffect(() => {
    const engine = renderEnv;
    if (renderDiv.current != null) {
      init(renderDiv.current, engine);
      renderDiv.current?.addEventListener('resize', () => {
        onResize(renderDiv.current, engine);
      });
      window.addEventListener('resize', () => {
        onResize(renderDiv.current, engine);
      });
    }
    return () => {
      // dispose engine when unmount.
      if (engineCallback) engineCallback(undefined);
      engine.dispose();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (engineCallback) engineCallback(renderEnv);
  }, [engineCallback, renderEnv]);

  if (!WEBGL.isWebGL2Available()) {
    return <div>WebGL2 Required.</div>;
  }

  return <div ref={renderDiv} className={classes.root} />;
}
