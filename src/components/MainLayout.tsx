import React, { useEffect, useRef, useState } from 'react';
import { createStyles, FormControlLabel, Grid, makeStyles, Switch, Theme } from '@material-ui/core';
import axios from 'axios';
import BlobCache from 'blobcache';
import RenderingEngine from '../engine/RenderingEngine';
import DisplayingTargets from './DisplayingTargets';
import RenderingView from '../engine/RenderingView';
import UrlRefObjectFactory, { GeometryDataType } from '../engine/MeshFactory';
import preDefinedColors from './preDefinedColors';
import FlatManager from './FlatsManager';
import SensorManager from './SensorManager';

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
  const [enableFlatSelection, setEnableFlatSelection] = useState<boolean>(true);
  const [enableMultiFlatsSelection, setEnableMultiFlatsSelection] = useState<boolean>(true);
  const [enableSensorSelection, setEnableSensorSelection] = useState<boolean>(false);

  const blobCache = useRef(new BlobCache<ArrayBuffer>('demoApp', 1)); // cache of the stl files.

  const engineRef = useRef<RenderingEngine | undefined>(undefined);
  const flatsManagerRef = useRef<FlatManager>(new FlatManager());
  const sensorsManagerRef = useRef<SensorManager>(new SensorManager());

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

  const onToggleDisplay3dView = () => {
    setDisplay3dView(!display3dView);
  };

  const applyEnableSelection = (newValue: boolean) => {
    const engine = engineRef.current;
    if (engine) {
      if (newValue) {
        flatsManagerRef.current.Bind(engine);
      } else {
        flatsManagerRef.current.Bind(undefined);
      }
    }
  };

  const applyEnableSensorSelection = (newValue: boolean) => {
    const engine = engineRef.current;
    if (engine) {
      if (newValue) {
        sensorsManagerRef.current.Bind(engine);
      } else {
        sensorsManagerRef.current.Bind(undefined);
      }
    }
  };

  const onToggleEnableSensorSelection = () => {
    const newValue = !enableSensorSelection;
    if (newValue) {
      setEnableFlatSelection(false);
      applyEnableSelection(false);
    }
    setEnableSensorSelection(newValue);
    applyEnableSensorSelection(newValue);
  };

  const onToggleEnableSelection = () => {
    const newValue = !enableFlatSelection;
    if (newValue) {
      setEnableSensorSelection(false);
      applyEnableSensorSelection(false);
    }
    setEnableFlatSelection(newValue);
    applyEnableSelection(newValue);
  };

  const onToggleMultiSelection = () => {
    const newValue = !enableMultiFlatsSelection;
    setEnableMultiFlatsSelection(newValue);
    flatsManagerRef.current.isMultipleSelection = newValue;
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

  const setupEngine = async (eg: RenderingEngine | undefined) => {
    if (engineRef.current !== eg) {
      if (engineRef.current) {
        // unintialize old engine.
        flatsManagerRef.current.Bind(undefined);
      }

      engineRef.current = eg;

      flatsManagerRef.current.Bind(eg);

      if (engineRef.current) {
        engineRef.current = eg;

        // update selection setting
        applyEnableSelection(enableFlatSelection);
        flatsManagerRef.current.isMultipleSelection = enableMultiFlatsSelection;

        // initialize after set engine.
        const promises: Promise<void>[] = [];
        selectedStls.forEach(async (stl) => {
          promises.push(loadStl(stl));
        });

        await Promise.all(promises);

        // TODO: update the selected flats.
        flatsManagerRef.current.restore();
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
            control={<Switch checked={enableSensorSelection} onChange={onToggleEnableSensorSelection} />}
            label="Enable Sensors Selection"
          />
          <FormControlLabel
            control={<Switch checked={enableFlatSelection} onChange={onToggleEnableSelection} />}
            label="Enable Flat Selection"
          />
          <FormControlLabel
            control={<Switch checked={enableMultiFlatsSelection} onChange={onToggleMultiSelection} />}
            label="Enable Multiple Flat Selection"
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
