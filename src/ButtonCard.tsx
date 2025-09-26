import { ReactNode } from "react";
import { css } from "storybook/internal/theming";
import Card, { CardTitle, CardDescription, CardIcon } from "./Card";

type ButtonCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  disabled?: boolean;
  onClick?: () => void;
};

const CardButtonVariant = Card.withComponent("button");

export default function ButtonCard(props: ButtonCardProps) {
  const { icon, title, description, disabled, onClick } = props;

  return (
    <CardButtonVariant
      css={css`
        font-size: inherit;
        transition: background-color 0.18s;

        &:hover:not(:disabled),
        &:focus-visible {
          background-color: #f0f0f0;
        }

        &:active {
          transition: background-color 0s;
          background-color: #fcfcfc;
        }

        &:disabled {
          color: #888;
        }
      `}
      onClick={onClick}
      disabled={disabled}
    >
      <CardIcon>{icon}</CardIcon>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardButtonVariant>
  );
}
