import React, { useEffect, useState } from 'react';
import { FormControl, Grid, InputLabel, makeStyles, MenuItem, Select, Slider } from '@material-ui/core';
import { Direction } from '../engine/interfaces';

interface IClippingSelectorProps {
  disabled: boolean;
  positions: number[];
  range: number[];
  onClippingChanged: (newPosition: { dir: Direction; pos: number }) => void;
}

const useStyles = makeStyles((theme) => ({
  root: {
    width: 500,
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 200,
  },
  slider: {
    width: 200,
  },
}));

export default function ClippingSelector(props: IClippingSelectorProps): JSX.Element {
  const classes = useStyles();

  const { disabled, positions, range, onClippingChanged } = props;

  const [currentClipDirection, setCurrentClipDirection] = useState<Direction>(Direction.XPositive);

  const [clipPosition, setClipPosition] = useState<number>(0);
  const [minClipPosition, setMinClipPosition] = useState<number>(0);
  const [maxClipPosition, setMaxClipPosition] = useState<number>(0);
  const [step, setStep] = useState<number>(0.1);
  const [marks, setMarks] = useState<{ value: number; label: string }[]>([]);

  useEffect(() => {
    if (range.length > 0) {
      const min = range[currentClipDirection < 3 ? currentClipDirection + 3 : currentClipDirection];
      const max = range[currentClipDirection >= 3 ? currentClipDirection - 3 : currentClipDirection];
      setMinClipPosition(min);
      setMaxClipPosition(max);
      setStep((max - min) / 100);
      setMarks([
        { value: min, label: min.toString() },
        { value: max, label: max.toString() },
      ]);
    }
  }, [range, currentClipDirection]);

  useEffect(() => {
    setClipPosition(positions[currentClipDirection]);
  }, [positions, currentClipDirection]);

  const onDirectionChanged = (
    event: React.ChangeEvent<{
      name?: string | undefined;
      value: unknown;
    }>
  ) => {
    const dir = event.target.value as Direction;
    setCurrentClipDirection(dir);
  };

  const onClipPositionChanged = (event: unknown, value: number | number[]) => {
    const pos = value as number;
    positions[currentClipDirection] = pos;
    setClipPosition(pos);
    onClippingChanged({ dir: currentClipDirection, pos });
  };

  const valueText = (value: number): string => {
    return value.toPrecision(4);
  };

  return (
    <Grid container className={classes.root}>
      <FormControl disabled={disabled} className={classes.formControl}>
        <InputLabel id="demo-simple-select-label">Clipping Direction:</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={currentClipDirection}
          onChange={onDirectionChanged}
        >
          <MenuItem value={Direction.XPositive}>X+</MenuItem>
          <MenuItem value={Direction.YPositive}>Y+</MenuItem>
          <MenuItem value={Direction.ZPositive}>Z+</MenuItem>
          <MenuItem value={Direction.XNegative}>X-</MenuItem>
          <MenuItem value={Direction.YNegative}>Y-</MenuItem>
          <MenuItem value={Direction.ZNegative}>Z-</MenuItem>
        </Select>
      </FormControl>
      <div>
        <InputLabel id="demo-simple-select-label">Position:</InputLabel>
        <Slider
          disabled={disabled}
          className={classes.slider}
          value={clipPosition}
          valueLabelFormat={valueText}
          step={step}
          onChange={onClipPositionChanged}
          min={minClipPosition}
          max={maxClipPosition}
          aria-labelledby="continuous-slider"
          valueLabelDisplay="auto"
          marks={marks}
        />
      </div>
    </Grid>
  );
}
