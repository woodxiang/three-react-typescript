import { FormControl, Grid, InputLabel, makeStyles } from '@material-ui/core';
import MenuItem from '@material-ui/core/MenuItem/MenuItem';
import Select from '@material-ui/core/Select/Select';
import React from 'react';

interface IBackgroundSelectorProps {
  selectedBackground: string;
  onBackgroundChanged: (newBackground: string) => void;
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

export default function BackgroundSelector(props: IBackgroundSelectorProps): JSX.Element {
  const classes = useStyles();

  const { selectedBackground, onBackgroundChanged } = props;

  return (
    <Grid container className={classes.root}>
      <FormControl className={classes.formControl}>
        <InputLabel id="demo-simple-select-label">Clipping Direction:</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={selectedBackground}
          onChange={(event) => {
            onBackgroundChanged(event.target.value as string);
          }}
        >
          <MenuItem value="dark">Dark</MenuItem>
          <MenuItem value="light">Light</MenuItem>
          <MenuItem value="gradient">Gradient</MenuItem>
        </Select>
      </FormControl>
    </Grid>
  );
}
