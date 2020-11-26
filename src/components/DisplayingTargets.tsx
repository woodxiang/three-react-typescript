import {
  Checkbox,
  createStyles,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  makeStyles,
  Theme,
} from '@material-ui/core';
import React from 'react';

interface IDisplayingTargetsProps {
  stlLoaded: boolean;
  stlFiles: string[];
  selectedStls: string[];
  onSelctedStlChanged: (newSelections: string) => void;
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.palette.background.paper,
    },
  })
);

export default function DisplayingTargets(props: IDisplayingTargetsProps): JSX.Element {
  const { stlLoaded, stlFiles, selectedStls, onSelctedStlChanged } = props;
  const classes = useStyles();
  if (!stlLoaded) {
    return <div>Loading</div>;
  }

  const handleListItemClick = (item: string) => {
    onSelctedStlChanged(item);
  };

  return (
    <List className={classes.root}>
      {stlFiles.map((item) => {
        return (
          <ListItem key={item} role={undefined} button dense onClick={() => handleListItemClick(item)}>
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={selectedStls.indexOf(item) !== -1}
                tabIndex={-1}
                disableRipple
                inputProps={{ 'aria-labelledby': item }}
              />
            </ListItemIcon>
            <ListItemText id={item} primary={item} />
          </ListItem>
        );
      })}
    </List>
  );
}
