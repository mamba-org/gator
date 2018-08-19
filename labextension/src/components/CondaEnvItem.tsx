import * as React from "react";
import { style } from "typestyle";
import { GlobalStyle } from "./globalStyles";

export interface EnvItemProps {
  name: string;
  selected?: boolean;
  onClick: (name: string) => void;
}

export class CondaEnvItem extends React.Component<EnvItemProps> {
  render() {
    return (
      <div
        className={this.props.selected ? Style.SelectedItem : Style.Item}
        onClick={() => this.props.onClick(this.props.name)}
      >
        {this.props.name}
      </div>
    );
  }
}

namespace Style {
  export const Item = style(GlobalStyle.ListItem, {
    padding: "2px 0 5px 5px",

    $nest: {
      "&:hover": {
        backgroundColor: "var(--jp-layout-color2)",
        border: "1px solid var(--jp-border-color2)"
      }
    }
  });

  export const SelectedItem = style(GlobalStyle.ListItem, {
    padding: "2px 0 5px 5px",
    backgroundColor: "var(--jp-brand-color1)",
    color: "var(--jp-ui-inverse-font-color1)",
    border: "1px solid var(--jp-brand-color1)",
    display: "flex",

    $nest: {
      "&::after": {
        content: `'▶️'`,
        display: "inline-block",
        textAlign: "right",
        flex: "1 1 auto",
        padding: "0 5px"
      }
    }
  });
}
