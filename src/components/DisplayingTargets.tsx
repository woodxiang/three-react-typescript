import { List, ListItem, ListItemText } from '@material-ui/core';
import React from 'react';

interface IDisplayingTargetsProps {
  stlLoaded: boolean;
  stlFiles: string[];
  selectedStl: string | null;
  onSelctedStlChanged: (newSelection: string) => void;
}

export default function DisplayingTargets(
  props: IDisplayingTargetsProps
): JSX.Element {
  const { stlLoaded, stlFiles, selectedStl, onSelctedStlChanged } = props;
  if (!stlLoaded) {
    return <div>Loading</div>;
  }

  const handleListItemClick = (item: string) => {
    onSelctedStlChanged(item);
  };

  return (
    <List>
      {stlFiles.map((item) => (
        <ListItem
          key={item}
          button
          dense
          selected={selectedStl === item}
          onClick={() => handleListItemClick(item)}
        >
          <ListItemText primary={item} />
        </ListItem>
      ))}
    </List>
  );
}
