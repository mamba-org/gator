import { NestedCSSProperties } from "typestyle/lib/types";

export namespace GlobalStyle {
  export const FaIcon: NestedCSSProperties = {
    minWidth: 16,
    minHeight: 16,
    display: "inline-block",
    verticalAlign: "text-top",
    fontWeight: "bold",
    color: "var(--jp-ui-font-color2)"
  };

  export const ListItem: NestedCSSProperties = {
    flex: "0 0 auto",
    border: "1px solid transparent",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "var(--jp-ui-font-color1)",
    fontSize: "var(--jp-ui-font-size1)",
    listStyleType: "none"
  };
}
