import styled from "@emotion/styled";

type ButtonProps = {
  variant?: "primary" | "secondary";
};

const COLOR = {
  primary: {
    background: "rgba(24, 105, 205, 1)",
    color: "#fff",
    border: "solid 1px transparent",
    hoverBackground: "rgba(61, 121, 195, 1)",
    hoverColor: "#fff",
    hoverBorder: "solid 1px transparent",
  },
  secondary: {
    background: "#fff",
    color: "#444",
    border: "solid 1px #ddd",
    hoverBackground: "rgba(245, 245, 245, 1)",
    hoverColor: "#444",
    hoverBorder: "solid 1px #ddd",
  },
};

const Button = styled.button`
  ${(props: ButtonProps) => {
    const variant = props.variant ?? "primary";

    return `
    background-color: ${COLOR[variant].background};
    color: ${COLOR[variant].color};
    border: ${COLOR[variant].border};

    &:hover,
    &:focus-visible {
      background-color: ${COLOR[variant].hoverBackground};
      color: ${COLOR[variant].hoverColor};
      border: ${COLOR[variant].hoverBorder};
    }

    &:active {
      opacity: 0.7;
    }
  `;
  }}

  border-radius: 0.25em;
  padding: 0.5em 1em;
`;

export default Button;
