import React, { useEffect, useRef, useState } from 'react';
import { createStyles, Grid, makeStyles, Theme } from '@material-ui/core';
import axios from 'axios';
import BlobCache from '../utilities/BlobCache/BlobCache';
import DisplayingTargets from './DisplayingTargets';
import RenderingView from './RenderingView';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
    },
    paper: {
      padding: theme.spacing(1),
      textAlign: 'center',
      color: theme.palette.text.secondary,
    },
  })
);

export default function MainLayout(): JSX.Element {
  const [stlLoaded, setStlLoaded] = useState(false); // state to indicate all stl loaded.
  const [stlFiles, setStlFiles] = useState<string[]>([]); // state to keep all stlfiles.
  const [selectedStl, setSelectedStl] = useState<string | null>(null); // state to keep the selected stl
  const [stlDisplaying, setStlDisplaying] = useState<ArrayBuffer | null>(null); // state to keep the displaying stl.

  const blobCache = useRef(
    new BlobCache<ArrayBuffer>('demoApp', 'stlFiles', 1)
  ); // cache of the stl files.

  // handle the event when selected stl changed.
  const handleSelectedStlChanged = async (item: string | null) => {
    setSelectedStl(item);
    if (item != null) {
      const data = await blobCache.current.pickAsync(item);
      setStlDisplaying(data || null);
    } else {
      setStlDisplaying(null);
    }
  };

  // init effect when mount.
  useEffect(() => {
    // load all stl files if file is not in cache.
    async function loadStlFiles() {
      const result = await axios('/api/stls/');

      await blobCache.current.openAsync();
      console.log('BlobCache opened.');

      const results: Promise<boolean>[] = [];

      const newFiles = result.data as string[];

      newFiles.forEach((stlFile) => {
        const url = `/api/stls/${stlFile}`;
        const promise = blobCache.current
          .existAsync(stlFile)
          .then((isExists) => {
            if (!isExists) {
              return axios(url, { responseType: 'arraybuffer' }).then((res) => {
                return res.data;
              });
            }

            return false;
          })
          .then((lastResult) => {
            if (lastResult) {
              return blobCache.current.insertAsync(stlFile, lastResult);
            }
            return false;
          });
        results.push(promise);
      });

      await Promise.all(results);

      setStlFiles(newFiles);
      setStlLoaded(true);
    }

    loadStlFiles();
  }, []);

  const classes = useStyles();

  return (
    <div className={classes.root}>
      <Grid container spacing={4}>
        <Grid item md={2}>
          <DisplayingTargets
            stlLoaded={stlLoaded}
            stlFiles={stlFiles}
            selectedStl={selectedStl}
            onSelctedStlChanged={handleSelectedStlChanged}
          />
        </Grid>
        <Grid item md={10}>
          <RenderingView displayingSTL={stlDisplaying} />
        </Grid>
      </Grid>
    </div>
  );
}
