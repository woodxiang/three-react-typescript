import { createStyles, makeStyles } from '@material-ui/core';
import React, { useEffect, useRef } from 'react';
import { WEBGL } from 'three/examples/jsm/WebGL';
import RenderingEngine from '../engine/RenderingEngine';
import { DataRefUrl } from '../engine/UrlRefObjectFactory';

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
  dataRefUrls: DataRefUrl[];
}

export default function RenderingView(props: IRenderingViewProps): JSX.Element {
  const renderDiv = useRef<HTMLDivElement>(null);
  const renderEnv = useRef<RenderingEngine>(new RenderingEngine());
  const classes = useStyles();

  const { dataRefUrls } = props;

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
    const renderingObjects = renderEnv.current.getObjects();
    const update = async () => {
      const toAdd = dataRefUrls.filter((v) => {
        return renderingObjects.indexOf(v.url) === -1;
      });

      const toRemove = renderingObjects.filter((v) => {
        return (
          dataRefUrls.find((refUrl) => {
            return refUrl.url === v;
          }) === undefined
        );
      });

      const promises: Promise<unknown>[] = [];
      toAdd.forEach(async (item) => {
        promises.push(renderEnv.current.addUrlRefObject(item));
      });

      toRemove.forEach((item) => {
        renderEnv.current.removeObject(item);
      });

      if (promises) {
        await Promise.all(promises);
      }
    };
    update();
  }, [dataRefUrls]);

  if (!WEBGL.isWebGL2Available()) {
    return <div>WebGL Reauired.</div>;
  }

  return <div ref={renderDiv} className={classes.root} />;
}
