import React from 'react';
import RenderingView from './RenderingView';
import DisplayingTargets from './DisplayingTargets';
import './layout.css';

export default class MainLayout extends React.PureComponent {
  render() {
    return (
      <div className="layout">
        <div className="border left">
          <DisplayingTargets />
        </div>
        <div className="border">
          <RenderingView />
        </div>
      </div>
    );
  }
}
