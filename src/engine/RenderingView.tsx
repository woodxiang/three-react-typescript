import { createStyles, makeStyles } from '@material-ui/core';
import React, { useEffect, useRef } from 'react';
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
  engineCallback: (engine: RenderingEngine) => void;
}

export default function RenderingView(props: IRenderingViewProps): JSX.Element {
  const renderDiv = useRef<HTMLDivElement>(null);
  const renderEnv = useRef<RenderingEngine>(new RenderingEngine());
  const classes = useStyles();

  const { engineCallback } = props;

  useEffect(() => {
    const engine = renderEnv.current;
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
      engine.Dispose();
    };
  }, []);

  useEffect(() => {
    if (engineCallback) engineCallback(renderEnv.current);
  }, [engineCallback]);

  if (!WEBGL.isWebGL2Available()) {
    return <div>WebGL Reauired.</div>;
  }

  return <div ref={renderDiv} className={classes.root} />;
}
