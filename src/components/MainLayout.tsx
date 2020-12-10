import React, { useEffect, useRef, useState } from 'react';
import { createStyles, FormControlLabel, Grid, makeStyles, Switch, Theme } from '@material-ui/core';
import axios from 'axios';
import BlobCache from 'blobcache';
import { IFaceSelectionResult, SELECTIONMODE } from '../engine/interfaces';
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
  const [display3dView, setDisplay3dView] = useState<boolean>(true);
  const [enablePlaneSelection, setEnablePlaneSelection] = useState<boolean>(false);
  const [enableMultiSelectioin, setEnableMultiSelection] = useState<boolean>(false);

  const blobCache = useRef(new BlobCache<ArrayBuffer>('demoApp', 1)); // cache of the stl files.

  const engineRef = useRef<RenderingEngine | undefined>(undefined);
  const selectedPlanes = useRef<{ name: string; indexes: number[] }[]>([]);

  const stlPrefix = '/api/stls/';

  const loadStl = async (item: string) => {
    const engine = engineRef.current;
    if (!engine) {
      throw Error('invalid engine.');
    }
    const newMesh = await UrlRefObjectFactory.createSolidMesh(
      stlPrefix + item,
      GeometryDataType.STLMesh,
      preDefinedColors[stlFiles.indexOf(item)]
    );
    if (newMesh) engine.AddMesh(newMesh);
  };

  // handle the event when selected stl changed.
  const handleSelectedStlChanged = async (item: string) => {
    const engine = engineRef.current;
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
        await loadStl(item);
      }
    }

    setSelectedStls(newSelectedStls);
  };

  const onPlaneClicked = (res: IFaceSelectionResult | undefined) => {
    if (!res) {
      throw Error('no face selected.');
    }
    const engine = engineRef.current;
    const index = selectedPlanes.current.findIndex((v) => v.name === res.name && v.indexes[0] === res.faceIndexes[0]);
    if (enableMultiSelectioin) {
      if (index >= 0) {
        const newSelectedPlanes = selectedPlanes.current.filter((v, vindex) => vindex !== index);
        selectedPlanes.current = newSelectedPlanes;
      } else {
        selectedPlanes.current.concat([{ name: res.name, indexes: res.faceIndexes }]);
      }
    } else if (index < 0) {
      selectedPlanes.current = [{ name: res.name, indexes: res.faceIndexes }];
      if (engine) {
        engine.ClearAllPlanes();
        engine.AddPlanes(res.name, res.faceIndexes);
      }
    }
  };

  const onToggleDisplay3dView = () => {
    setDisplay3dView(!display3dView);
  };

  const onToggleEnableSelection = () => {
    const engine = engineRef.current;
    setEnablePlaneSelection(!enablePlaneSelection);
    if (engine) {
      engine.selectionMode = !enablePlaneSelection ? SELECTIONMODE.Plane : SELECTIONMODE.Disabled;
      if (!enablePlaneSelection) {
        engine.faceClickedEvent.add(onPlaneClicked);
      } else {
        engine.faceClickedEvent.remove(onPlaneClicked);
      }
    }
  };

  const onToggleMultiSelection = () => {
    setEnableMultiSelection(!enableMultiSelectioin);
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

  const setupEngine = (eg: RenderingEngine | undefined) => {
    if (engineRef.current !== eg) {
      if (engineRef.current) {
        // unintialize old engine.
        engineRef.current.faceClickedEvent.remove(onPlaneClicked);
      }

      engineRef.current = eg;
      if (engineRef.current) {
        engineRef.current = eg;
        // initialize after set engine.
        selectedStls.forEach((stl) => {
          loadStl(stl);
        });

        // TODO: update the selected planes.
      }
    }
  };

  return (
    <div className={classes.root}>
      <Grid container spacing={4} className={classes.full}>
        <Grid item md={12}>
          <FormControlLabel
            control={<Switch checked={display3dView} onChange={onToggleDisplay3dView} />}
            label="Display 3D View"
          />
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
        </Grid>{' '}
        <Grid item md={10} className={classes.full}>
          {display3dView && <RenderingView engineCallback={setupEngine} />}6
          {!display3dView && <RenderingView engineCallback={setupEngine} />}
        </Grid>
      </Grid>
    </div>
  );
}
