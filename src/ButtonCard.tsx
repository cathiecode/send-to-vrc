import { ReactNode } from "react";
import { css } from "storybook/internal/theming";
import Card, { CardTitle, CardDescription, CardIcon } from "./Card";

type ButtonCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
};

const CardButtonVariant = Card.withComponent("button");

export default function ButtonCard(props: ButtonCardProps) {
  const { icon, title, description, onClick } = props;

  return (
    <CardButtonVariant
      css={css`
        font-size: inherit;
        transition: background-color 0.18s;

        &:hover,
        &:focus-visible {
          background-color: #f0f0f0;
        }

        &:active {
          transition: background-color 0s;
          background-color: #fcfcfc;
        }
      `}
      onClick={onClick}
    >
      <CardIcon>{icon}</CardIcon>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardButtonVariant>
  );
}
