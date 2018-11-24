import * as React from "react";
import { style } from "typestyle/lib";

export interface CondaPkgStatusBarProps {
  isLoading: boolean;
  infoText: string;
}

export const CondaPkgStatusBar = (props: CondaPkgStatusBarProps) => {
  return (
    <div className={Style.Container}>
      <div className={Style.Text}>{props.infoText}</div>
    </div>
  );
};

namespace Style {
  export const Container = style({
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    height: 24,
    borderTop: "var(--jp-border-width) solid var(--jp-toolbar-border-color)"
  });

  export const Text = style({
    flex: "0 0 auto",
    padding: "2px 5px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "var(--jp-ui-font-color1)",
    fontSize: "var(--jp-ui-font-size1)"
  });
}
