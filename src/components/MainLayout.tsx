import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Button, createStyles, FormControlLabel, Grid, makeStyles, Switch, Tab, Tabs, Theme } from '@material-ui/core';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { Color } from 'three/src/math/Color';
import ContentManager from '../engine/ContentManager';
import { Direction } from '../engine/interfaces';
import RenderingEngine from '../engine/RenderingEngine';
import StlFilesView from './StlFilesView';
import RenderingView from '../engine/RenderingView';
import { GeometryDataType } from '../engine/MeshFactory';
import preDefinedColors from './preDefinedColors';
import DracoFilesView from './DracoFilesView';
import ClippingSelector from './ClippingSelector';
import PreprocessViewManager from '../engine/PreprocessViewManager';
import PostProcessViewManager from '../engine/PostProcessViewManager';
import BackgroundSelector from './BackgroundSelector';

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
  const [stlFiles, setStlFiles] = useState<string[]>([]); // state to keep all stl files.
  const [dracoFiles, setDracoFiles] = useState<string[]>([]);
  const [selectedStls, setSelectedStls] = useState<string[]>([]); // state to keep the selected stl
  const [selectedDracos, setSelectedDracos] = useState<string[]>([]);
  const [selectedBackground, setSelectedBackground] = useState<string>('light');
  const [enableFlatSelection, setEnableFlatSelection] = useState<boolean>(false);
  const [enableMultiFlatsSelection, setEnableMultiFlatsSelection] = useState<boolean>(false);
  const [enableClipping, setEnableClipping] = useState<boolean>(false);
  const [enableSensorSelection, setEnableSensorSelection] = useState<boolean>(false);
  const [enableMeasurement, setEnableMeasurement] = useState<boolean>(false);
  const [enableValuePick, setEnableValuePick] = useState<boolean>(false);
  const [displayingTab, setDisplayingTab] = useState<number>(0);
  const [displayingPreprocessView, setDisplayingPreprocessView] = useState<boolean>(false);

  const engineRef = useRef<RenderingEngine | undefined>(undefined);

  const preprocessViewManager = useMemo<PreprocessViewManager>(() => new PreprocessViewManager(), []);

  const postProcessViewManager = useMemo<PostProcessViewManager>(() => new PostProcessViewManager(), []);
  postProcessViewManager.changeBackground(new Color(0xf5, 0xf5, 0xf5));

  const currentViewManager = useMemo<ContentManager>(
    () => (displayingPreprocessView ? preprocessViewManager : postProcessViewManager),
    [displayingPreprocessView, postProcessViewManager, preprocessViewManager]
  );

  const { clipPositions, limitBox } = currentViewManager.clipping;

  const stlPrefix = '/api/stls/';
  const dracoPrefix = 'api/dracos/';

  const handleTabChange = (event: ChangeEvent<unknown>, newValue: number) => {
    setDisplayingTab(newValue);
  };

  const loadStl = async (item: string) => {
    currentViewManager.LoadStl(stlPrefix + item, preDefinedColors[stlFiles.indexOf(item)]);
  };

  const loadDraco = async (item: string) => {
    let dracoType = GeometryDataType.DracoExMesh;
    if (item.endsWith('.sp')) {
      dracoType = GeometryDataType.DracoExPoints;
    }

    switch (dracoType) {
      case GeometryDataType.DracoExMesh:
        postProcessViewManager.LoadDracoExMesh(dracoPrefix + item);
        break;
      case GeometryDataType.DracoExPoints:
        postProcessViewManager.LoadDracoExPoints(dracoPrefix + item, 'red');
        break;
      default:
        throw Error('Invalid Geometry type.');
    }
  };

  // handle the event when selected stl changed.
  const handleSelectedStlChanged = async (item: string) => {
    const index = selectedStls.indexOf(item);
    const newSelectedStls = [...selectedStls];
    if (index !== -1) {
      // remove mesh
      newSelectedStls.splice(index, 1);
      currentViewManager.remove(stlPrefix + item);
    } else {
      // add mesh
      newSelectedStls.push(item);
      await loadStl(item);
    }

    setSelectedStls(newSelectedStls);
  };

  const handleSelectedDracoChanged = async (item: string) => {
    const index = selectedDracos.indexOf(item);
    const newSelectedDracos = [...selectedDracos];
    if (index !== -1) {
      newSelectedDracos.splice(index, 1);
      postProcessViewManager.remove(dracoPrefix + item);
    } else {
      newSelectedDracos.push(item);
      await loadDraco(item);
    }

    setSelectedDracos(newSelectedDracos);
  };

  const onToggleDisplayPreprocessView = (event: ChangeEvent<HTMLInputElement>, enabled: boolean) => {
    setDisplayingPreprocessView(enabled);
  };

  const onToggleEnableSensorSelection = (event: ChangeEvent<HTMLInputElement>, enabled: boolean) => {
    setEnableSensorSelection(enabled);
  };

  const onToggleFlatEnableSelection = (event: ChangeEvent<HTMLInputElement>, enabled: boolean) => {
    setEnableFlatSelection(enabled);
  };

  const onToggleMultiSelection = (event: ChangeEvent<HTMLInputElement>, enabled: boolean) => {
    setEnableMultiFlatsSelection(enabled);
  };

  const onToggleClipping = (event: ChangeEvent<HTMLInputElement>, enabled: boolean) => {
    setEnableClipping(enabled);
  };

  const onToggleMeasurement = (event: ChangeEvent<HTMLInputElement>, enabled: boolean) => {
    setEnableMeasurement(enabled);
  };

  const onToggleValuePick = (event: ChangeEvent<HTMLInputElement>, enabled: boolean) => {
    setEnableValuePick(enabled);
  };

  const onBackgroundChanged = (newBackground: string) => {
    setSelectedBackground(newBackground);
  };

  useEffect(() => {
    if (preprocessViewManager !== currentViewManager) {
      preprocessViewManager.bind(undefined);
    }
    if (postProcessViewManager !== currentViewManager) {
      postProcessViewManager.bind(undefined);
    }
    currentViewManager.bind(engineRef.current);
  }, [currentViewManager, postProcessViewManager, preprocessViewManager]);

  useEffect(() => {
    let colors: Color | Color[] | undefined;
    switch (selectedBackground) {
      case 'dark':
        colors = new Color('black');
        break;
      case 'light':
        colors = new Color('grey');
        break;
      case 'gradient':
        colors = [new Color('black'), new Color('grey')];
        break;
      default:
        throw Error('Invalid background value.');
    }

    currentViewManager.background = colors;
  }, [currentViewManager, selectedBackground]);

  useEffect(() => {
    if (enableSensorSelection) {
      setEnableFlatSelection(false);
      setEnableMeasurement(false);
    }

    if (preprocessViewManager && preprocessViewManager.enableSensors !== enableSensorSelection) {
      preprocessViewManager.enableSensors = enableSensorSelection;
    }
  }, [enableSensorSelection, preprocessViewManager]);

  useEffect(() => {
    if (enableFlatSelection) {
      setEnableSensorSelection(false);
      setEnableMeasurement(false);
    }
    if (preprocessViewManager && preprocessViewManager.enableFlats !== enableFlatSelection) {
      preprocessViewManager.enableFlats = enableFlatSelection;
    }
  }, [enableFlatSelection, preprocessViewManager]);

  useEffect(() => {
    if (enableMeasurement) {
      setEnableSensorSelection(false);
      setEnableFlatSelection(false);
    }
    if (preprocessViewManager && preprocessViewManager.enableMeasurement !== enableMeasurement) {
      preprocessViewManager.enableMeasurement = enableMeasurement;
    }
  }, [enableMeasurement, preprocessViewManager]);

  useEffect(() => {
    if (postProcessViewManager && postProcessViewManager.enableValuePick !== enableValuePick) {
      postProcessViewManager.enableValuePick = enableValuePick;
    }
  }, [enableValuePick, postProcessViewManager]);

  useEffect(() => {
    if (preprocessViewManager) {
      preprocessViewManager.isMultipleSelection = enableMultiFlatsSelection;
    }
  }, [enableMultiFlatsSelection, preprocessViewManager]);

  useEffect(() => {
    if (currentViewManager) {
      currentViewManager.enableClipping = enableClipping;
    }
  }, [enableClipping, currentViewManager]);

  const onClippingChanged = (newPosition: { dir: Direction; pos: number }) => {
    if (!currentViewManager.clipping) {
      return;
    }
    const clippingManager = currentViewManager.clipping;
    clippingManager.updateClip(newPosition.dir, newPosition.pos);
  };

  const onExportImage = () => {
    if (!engineRef.current) {
      throw Error('invalid engine.');
    }

    const jpegData = engineRef.current.exportImage(3840, 2160);

    saveAs(new Blob([jpegData], { type: 'image/jpeg' }), 'test.jpeg');
  };

  const onTest = () => {
    if (!engineRef.current) {
      throw Error('invalid engine');
    }

    const engine = engineRef.current;

    // engine.updateBackground([new Color(), new Color('gray')]);
    engine.setMeshColor(new Color('red'), stlPrefix + stlFiles[0]);
  };

  // init effect when mount.
  useEffect(() => {
    // load all stl files if file is not in cache.
    async function loadStlFiles() {
      const result = await axios(stlPrefix);

      const newFiles = result.data as string[];

      setStlFiles(newFiles);
    }

    async function loadDracoFiles() {
      const result = await axios(dracoPrefix);
      const newFiles = result.data as string[];
      setDracoFiles(newFiles);
    }

    loadStlFiles();
    loadDracoFiles();

    return () => {
      // dispose;
    };
  }, []);

  const classes = useStyles();

  const setupEngine = async (eg: RenderingEngine | undefined) => {
    const contentManager = currentViewManager;
    if (engineRef.current !== eg) {
      if (engineRef.current) {
        contentManager.bind(undefined);
      }

      engineRef.current = eg;

      if (engineRef.current) {
        contentManager.bind(engineRef.current);
      }
    }
  };

  const list =
    displayingTab === 0 ? (
      <StlFilesView
        stlLoaded={stlFiles.length > 0}
        stlFiles={stlFiles}
        selectedStls={selectedStls}
        onSelectedStlChanged={handleSelectedStlChanged}
      />
    ) : (
      <DracoFilesView
        dracoLoaded={dracoFiles.length > 0}
        dracoFiles={dracoFiles}
        selectedDracos={selectedDracos}
        onSelectedDracoChanged={handleSelectedDracoChanged}
      />
    );

  return (
    <div className={classes.root}>
      <Grid container spacing={4} className={classes.full}>
        <Grid item md={12}>
          <FormControlLabel
            control={<Switch checked={displayingPreprocessView} onChange={onToggleDisplayPreprocessView} />}
            label="Display Preprocess View"
          />

          <FormControlLabel
            control={
              <Switch
                disabled={currentViewManager !== preprocessViewManager}
                checked={enableSensorSelection}
                onChange={onToggleEnableSensorSelection}
              />
            }
            label="Enable Sensors Selection"
          />
          <FormControlLabel
            control={
              <Switch
                disabled={currentViewManager !== preprocessViewManager}
                checked={enableFlatSelection}
                onChange={onToggleFlatEnableSelection}
              />
            }
            label="Enable Flat Selection"
          />
          <FormControlLabel
            control={
              <Switch
                disabled={currentViewManager !== preprocessViewManager || !enableFlatSelection}
                checked={enableMultiFlatsSelection}
                onChange={onToggleMultiSelection}
              />
            }
            label="Enable Multiple Flat Selection"
          />
          <FormControlLabel
            control={<Switch checked={enableClipping} onChange={onToggleClipping} />}
            label="Enable Clipping"
          />
          <FormControlLabel
            control={
              <Switch
                disabled={currentViewManager !== preprocessViewManager}
                checked={enableMeasurement}
                onChange={onToggleMeasurement}
              />
            }
            label="Enable Measurement"
          />
          <FormControlLabel
            control={
              <Switch
                disabled={currentViewManager !== postProcessViewManager}
                checked={enableValuePick}
                onChange={onToggleValuePick}
              />
            }
            label="Enable Pick Value"
          />
          <BackgroundSelector selectedBackground={selectedBackground} onBackgroundChanged={onBackgroundChanged} />
          <ClippingSelector
            disabled={currentViewManager !== preprocessViewManager}
            positions={clipPositions.slice(0)}
            range={limitBox}
            onClippingChanged={onClippingChanged}
          />
          <Button onClick={onExportImage}>Export Image</Button>
          <Button onClick={onTest}>Test</Button>
        </Grid>
        <Grid item md={2} className={classes.full}>
          <Tabs value={displayingTab} onChange={handleTabChange} aria-label="models">
            <Tab label="STL" id="simple-tab-0" aria-controls="simple-tabpanel-0" />
            <Tab label="Draco" id="simple-tab-1" aria-controls="simple-tabpanel-1" />
          </Tabs>
          {list}
        </Grid>
        <Grid item md={10} className={classes.full}>
          <RenderingView engineCallback={setupEngine} />
        </Grid>
      </Grid>
    </div>
  );
}
