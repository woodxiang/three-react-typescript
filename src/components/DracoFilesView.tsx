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

interface IDracoFilesViewProps {
  dracoLoaded: boolean;
  dracoFiles: string[];
  selectedDracos: string[];
  onSelctedDracoChanged: (newSelections: string) => void;
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

export default function DracoFilesView(props: IDracoFilesViewProps): JSX.Element {
  const { dracoLoaded, dracoFiles, selectedDracos, onSelctedDracoChanged } = props;
  const classes = useStyles();
  if (!dracoLoaded) {
    return <div>Draco Loading</div>;
  }

  const handleListItemClick = (item: string) => {
    onSelctedDracoChanged(item);
  };

  return (
    <List className={classes.root}>
      {dracoFiles.map((item) => {
        return (
          <ListItem key={item} role={undefined} button dense onClick={() => handleListItemClick(item)}>
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={selectedDracos.indexOf(item) !== -1}
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
