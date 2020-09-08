import React from "react";
import { RenderingView } from "./RenderingView";
import { DisplayingTargets } from "./DisplayingTargets";
import "./layout.css";

export class MainLayout extends React.Component {
  render() {
    return (
      <div className="layout">
        <DisplayingTargets />
        <RenderingView />
      </div>
    );
  }
}
