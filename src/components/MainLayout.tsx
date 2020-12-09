import React, { useEffect, useRef, useState } from 'react';
import { createStyles, FormControlLabel, Grid, makeStyles, Switch, Theme } from '@material-ui/core';
import axios from 'axios';
import BlobCache from 'blobcache';
import { IFaceSelectionResult, SELECTIONMODE } from 'engine/interfaces';
import RenderingEngine from '../engine/RenderingEngine';
import DisplayingTargets from './DisplayingTargets';
import RenderingView from '../engine/RenderingView';
import UrlRefObjectFactory, { GeometryDataType } from '../engine/MeshFactory';
import preDefinedColors from './preDefinedColors';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
      height: '100%',
      width: '100%',
    },
    full: {
      height: '100%',
      width: '100%',
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
  const [selectedStls, setSelectedStls] = useState<string[]>([]); // state to keep the selected stl
  const [enablePlaneSelection, setEnablePlaneSelection] = useState<boolean>(false);
  const [enableMultiSelectioin, setEnableMultiSelection] = useState<boolean>(false);

  const [selectedPlanes, setSelectedPlanes] = useState<{ name: string; indexes: number[] }[]>([]);

  const blobCache = useRef(new BlobCache<ArrayBuffer>('demoApp', 1)); // cache of the stl files.

  let engine: RenderingEngine | undefined;

  const stlPrefix = '/api/stls/';

  // handle the event when selected stl changed.
  const handleSelectedStlChanged = async (item: string) => {
    const index = selectedStls.indexOf(item);
    const newSelectedStls = [...selectedStls];
    if (index !== -1) {
      // remove mesh
      newSelectedStls.splice(index, 1);
      if (engine) {
        engine.RemoveMesh(stlPrefix + item);
      }
    } else {
      // add mesh
      newSelectedStls.push(item);
      if (engine) {
        const newMesh = await UrlRefObjectFactory.createSolidMesh(
          stlPrefix + item,
          GeometryDataType.STLMesh,
          preDefinedColors[stlFiles.indexOf(item)]
        );
        if (newMesh) engine.AddMesh(newMesh);
      }
    }

    setSelectedStls(newSelectedStls);
  };

  const onPlaneClicked = (res: IFaceSelectionResult | undefined) => {
    if (!res) {
      throw Error('no face selected.');
    }
    const index = selectedPlanes.findIndex((v) => v.name === res.name && v.indexes[0] === res.faceIndexes[0]);
    if (enableMultiSelectioin) {
      if (index > 0) {
        const newSelectedPlanes = selectedPlanes.filter((v, vindex) => vindex !== index);
        setSelectedPlanes(newSelectedPlanes);
      } else {
        const newSelectedPlanes = selectedPlanes.concat([{ name: res.name, indexes: res.faceIndexes }]);
        setSelectedPlanes(newSelectedPlanes);
      }
    } else if (index < 0) {
      setSelectedPlanes([{ name: res.name, indexes: res.faceIndexes }]);
      if (engine) {
        engine.ClearAllPlanes();
        engine.AddPlanes(res.name, res.faceIndexes);
      }
    }
  };

  const onToggleEnableSelection = () => {
    setEnablePlaneSelection(!enablePlaneSelection);
    if (engine) {
      engine.selectionMode = !enablePlaneSelection ? SELECTIONMODE.Plane : SELECTIONMODE.Disabled;
      engine.faceClickedEvent.add(onPlaneClicked);
    }
  };

  const onToggleMultiSelection = () => {
    setEnableMultiSelection((prev) => !prev);
  };

  // init effect when mount.
  useEffect(() => {
    // load all stl files if file is not in cache.
    async function loadStlFiles() {
      const result = await axios(stlPrefix);

      await blobCache.current.openAsync();
      console.log('BlobCache opened.');

      const newFiles = result.data as string[];

      setStlFiles(newFiles);
      setStlLoaded(true);
    }

    loadStlFiles();
  }, []);

  const classes = useStyles();

  return (
    <div className={classes.root}>
      <Grid container spacing={4} className={classes.full}>
        <Grid item md={12}>
          <FormControlLabel
            control={<Switch checked={enablePlaneSelection} onChange={onToggleEnableSelection} />}
            label="Enable Plane Selection"
          />
          <FormControlLabel
            control={<Switch checked={enableMultiSelectioin} onChange={onToggleMultiSelection} />}
            label="Enable Multiple Selection"
          />
        </Grid>
        <Grid item md={2} className={classes.full}>
          <DisplayingTargets
            stlLoaded={stlLoaded}
            stlFiles={stlFiles}
            selectedStls={selectedStls}
            onSelctedStlChanged={handleSelectedStlChanged}
          />
        </Grid>
        <Grid item md={10} className={classes.full}>
          <RenderingView
            engineCallback={(eg) => {
              engine = eg;
            }}
          />
        </Grid>
      </Grid>
    </div>
  );
}
